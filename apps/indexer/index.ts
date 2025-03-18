import { StreamClient } from '@apibara/protocol'
import {
    Filter,
    StarkNetCursor,
    v1alpha2,
    FieldElement,
} from '@apibara/starknet'
import { RpcProvider, constants, provider, uint256 } from 'starknet'
import { formatUnits } from 'ethers'
import * as dotenv from 'dotenv'
import { BlockNumber } from 'starknet'
import { MongoDBService } from './mongo';
dotenv.config()


async function main() {
    try {
        // Apibara streaming
        const client = new StreamClient({
            url: 'sepolia.starknet.a5a.ch',
            token: process.env.APIBARA_TOKEN,
            async onReconnect(err, retryCount) {
                console.log('reconnect', err, retryCount)
                // Sleep for 1 second before retrying.
                await new Promise((resolve) => setTimeout(resolve, 1000))

                return { reconnect: true }
            },
        })

        const provider = new RpcProvider({
            nodeUrl: "https://starknet-sepolia.blastapi.io/fec79bb2-ce39-4a58-8668-a96ce919142e/rpc/v0_6"
        });
        const hashAndBlockNumber = await provider.getBlockLatestAccepted()
        // const latestBlock = hashAndBlockNumber.block_number
        const latestBlock = 61_118
        // The address of the event
        const eventSelector = FieldElement.fromBigInt(
            BigInt(
                '0x9149d2123147c5f43d258257fef0b7b969db78269369ebcf5ebb9eef8592f2',
            ),
        )

        // The array of contracts that emit the event
        const trackedAddresses = [
            FieldElement.fromBigInt(
                BigInt(
                    '0x0000000000000000000000000000000000000000000000000000000000000001',
                ),
            ),
        ]

        const classHash = FieldElement.fromBigInt(
            BigInt(
                '0x007445bd0b12c8d11bad4004e80475bc3b11aad68b6da1bbc593a95e3e6e50f3',
            ),
        )

        var numberOfCaptureEvents = 0

        function createFilter() {
            let filter = Filter.create()
                .withHeader({ weak: true })
            //Listen for the event from the tracked addresses
            trackedAddresses.forEach(address => {
                filter = filter
                    .addEvent((ev) => ev
                        .withFromAddress(
                            address
                        )
                        .withKeys([eventSelector])
                    );

            });
            //Listen for new contract deployments
            filter = filter.withStateUpdate((stateUpdateFilter) =>
                stateUpdateFilter.addDeployedContract(deployedContractFilter => {
                    return deployedContractFilter
                        .withClassHash(classHash)
                })
            );
            return filter.encode();
        }

        let filter = createFilter();


        client.configure({
            filter: filter,
            batchSize: 1,
            cursor: StarkNetCursor.createWithBlockNumber(latestBlock),
        })

        // Start listening to messages
        for await (const message of client) {
            switch (message.message) {

                case 'data': {
                    if (!message.data?.data) {
                        continue
                    }
                    for (const data of message.data.data) {
                        const block = v1alpha2.Block.decode(data)
                        const { header, events, transactions, stateUpdate } = block
                        if (!header || !transactions) {
                            continue
                        }
                        console.log('Block ' + header.blockNumber)

                        for (const event of events) {
                            console.log(event);
                            if (event.event && event.receipt) {
                                console.log('Event', event.event);
                                console.log('Event data', event.event.data);
                                numberOfCaptureEvents = numberOfCaptureEvents + 1;
                                console.log('Number of capture events:', numberOfCaptureEvents);

                                // Extract the main fields from the event
                                const from = event?.event?.keys ? FieldElement.toHex(event.event.keys[1]) : null;
                                const amount = event?.event?.keys ? FieldElement.toBigInt(event.event.keys[2]) : null;
                                const id = event?.event?.keys ? FieldElement.toBigInt(event.event.keys[3]) : null;
                                //console.log('Data:', event?.event?.data ? event.event.data : null);
                                //console.log('Amount:', event?.event?.data ? FieldElement.toBigInt(event.event.data[1]) : null);
                                console.log('TX Hash:', event.receipt?.transactionHash ? FieldElement.toHex(event.receipt.transactionHash) : 'No transaction hash');
                                console.log('From:', from);
                                console.log('Amount:', amount);
                                console.log('ID:', id);

                                const token = event?.event?.data ? FieldElement.toHex(event.event.data[0]) : null;


                                // Save the event to MongoDB
                                try {
                                    const db = await MongoDBService.getDb();
                                    const eventsCollection = db.collection('events');

                                    const eventData = {
                                        blockNumber: header.blockNumber?.toString(),
                                        transactionHash: event.transaction?.meta?.hash ? FieldElement.toHex(event.transaction.meta.hash) : null,
                                        from,
                                        amount,
                                        depositId: id,
                                        toAddress: event?.event?.fromAddress ? FieldElement.toHex(event.event.fromAddress) : null,
                                        token
                                        // Add any other relevant fields you want to save
                                    };

                                    const existingEvent = await eventsCollection.findOne({ transactionHash: eventData.transactionHash });

                                    if (!existingEvent) {
                                        // If the event doesn't exist, insert it into the database
                                        await eventsCollection.insertOne(eventData);
                                        console.log('Event saved to MongoDB');
                                    } else {
                                        console.log('Event with the same transaction hash already exists. Skipping insertion.');
                                    }


                                } catch (error) {
                                    console.error('Error saving event to MongoDB:', error);
                                }
                            }
                        }

                        if (stateUpdate
                            && stateUpdate.stateDiff?.deployedContracts?.length !== undefined
                            && stateUpdate.stateDiff.deployedContracts.length > 0) {

                            for (const deployedContract of stateUpdate.stateDiff.deployedContracts) {
                                console.log(deployedContract.contractAddress)
                            }
                            for (const deployedContract of stateUpdate.stateDiff.deployedContracts) {
                                if (!deployedContract.classHash) {
                                    continue
                                }
                                const deployedClassHash = FieldElement.toHex(deployedContract.classHash)

                                if (deployedClassHash == FieldElement.toHex(classHash)) {
                                    console.log("Passed")
                                    if (!deployedContract.contractAddress) {
                                        continue
                                    }
                                    const address = deployedContract.contractAddress
                                    const addressHex = FieldElement.toHex(address)
                                    console.log('Contract deployed:', addressHex)
                                    if (address && !trackedAddresses.includes(address)) {
                                        trackedAddresses.push(address)
                                        console.log('New contract deployed:', addressHex)
                                        filter = createFilter()
                                        if (header.blockNumber != null) {
                                            client.configure({
                                                filter: filter,
                                                batchSize: 1,
                                                cursor: StarkNetCursor.createWithBlockNumber(header.blockNumber),
                                            })
                                            console.log('Number of tracked addresses:', trackedAddresses.length)
                                            //Console log all the addresses(in hex) that are being tracked
                                            for (const address of trackedAddresses) {
                                                console.log('Tracked address:', FieldElement.toHex(address))
                                            }
                                        } else {
                                            console.error('Block number is undefined or null');
                                            // Handle the error or use a default value
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break
                }
                case 'invalidate': {
                    console.log('Invalidate message received')
                    filter = createFilter()
                    client.configure({
                        filter: filter,
                        batchSize: 1,
                        cursor: StarkNetCursor.createWithBlockNumber(latestBlock),
                    })
                    break
                }
                case 'heartbeat': {
                    console.log('Received heartbeat')
                    break
                }
            }
        }
    } catch (error) {
        console.error(error)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })


