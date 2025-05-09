"use client";
import {
  useAccount,
  useNetwork,
  useContract,
  useSendTransaction,
  useReadContract,
  useProvider,
} from "@starknet-react/core";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { CallData, cairo, BigNumberish } from "starknet";

import abi from "@/abis/abi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProvider as useProviderContext } from "@/contexts/ProviderContext";
import { useUser } from "@/contexts/UserContext";
import { saveBusinessData } from "@/services/databaseService";
import { BizWallet } from "@/types";
import { getRoute } from "@/utils/getRoute";

// Add additional styles for overriding dark mode background
const overrideDarkStyles =
  "dark:bg-white dark:border-gray-200 dark:placeholder:text-gray-500";

function generateApiKey() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

const FACTORY_ADDRESSES: Record<
  "katana" | "sepolia" | "mainnet",
  string | undefined
> = {
  katana: process.env.NEXT_PUBLIC_KATANA_FACTORY_ADDRESS,
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS,
  mainnet: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS,
};

export function BizForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const userContext = useUser();
  const providerContext = useProviderContext();
  const { account, isConnected } = useAccount();
  const { chain } = useNetwork();
  const factoryAddress =
    FACTORY_ADDRESSES[chain.network as "katana" | "sepolia" | "mainnet"];
  const { contract } = useContract({
    abi,
    address: factoryAddress,
  });
  const { sendAsync: createStrapexContract } = useSendTransaction({
    calls: contract
      ? [contract.populate("create_strapex_contract", [])]
      : undefined,
  });
  const { data: getUserStrapexAccount } = useReadContract({
    abi,
    functionName: "getUserStrapexAccount",
    address: factoryAddress,
    args: [account?.address],
  });
  const { provider } = useProvider();

  //If the component loads and the user is not logged in, we call the userContext.login()
  useEffect(() => {
    if (!isConnected && userContext) {
      userContext.login();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const apiKey = generateApiKey();
    console.log(apiKey);
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
    try {
      setIsLoading(true); // Set loading state to true
      const contractAddress = await createContract();
      if (contractAddress) {
        alert(`Your Strapex contract address is: ${contractAddress}`);
        /* const businessData: BizWallet = {
          name,
          description,
          tags,
          apiKey,
          ownerAddress: account.address,
          contractAddress,
          createdAt: new Date(),
        };
        await saveBusinessData(businessData, providerContext);
        alert("Business data saved successfully!");
        router.push(getRoute("/accounts", pathname)); // Redirect to account page */
      }
    } catch (error) {
      console.error("Error saving business data or executing contract:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false); // Set loading state back to false
    }
  };

  const createContract = async () => {
    // Placeholder for ABI and transaction details, adjust as necessary
    //const abi = undefined; // Define if you have ABI details
    const transactionsDetail = {
      maxFee: undefined, // Define if you have a max fee
      nonce: undefined, // Define if you have a nonce
      version: 1, // Use default or specify if different
    };

    const { transaction_hash: hash } = await createStrapexContract();
    const result = await provider.waitForTransaction(hash);
    if (result.isSuccess() && result.events.length > 0) {
      const contractAddress = result.events[0]!.keys[3]!;
      console.log(`Deployed Strapex contract address: ${contractAddress}`);
      return contractAddress;
    }
    return null; // Return null if contract deployment fails
  };

  const getBizOwnerContract = async () => {
    const contractAddress = `0x${BigInt(getUserStrapexAccount).toString(16)}`;
    alert(`Your Strapex contract address is: ${contractAddress}`);
  };

  const aproveAndDepositToContract = async () => {
    console.log("Approve and deposit to contract");
    const address = userContext?.contractAddress;

    const eth_address =
      "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7";

    if (!userContext?.address) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!address) {
      alert("Please create a business account first!");
      return;
    }
    console.log(`Initiating number`);
    const amount = 0.0001;
    const wei = BigInt(Math.round(amount * 1e18));
    const id: BigNumberish = 1;
    const transactions = [
      // Calling the first contract
      {
        contractAddress: eth_address,
        entrypoint: "approve",
        // approve 1 wei for bridge
        calldata: CallData.compile({
          spender: address,
          amount: cairo.uint256(wei),
        }),
      },
      // Calling the second contract
      {
        contractAddress: address,
        entrypoint: "deposit",
        // transfer 1 wei to the contract address
        calldata: CallData.compile({
          id: id,
          amount: wei,
        }),
      },
    ];

    console.log(`Transactions: ${transactions}`);
    if (userContext?.account) {
      const multiCall = await userContext?.account.execute(transactions);
      console.log(`MultiCall: ${multiCall}`);
      if (multiCall) {
        const hx = multiCall.transaction_hash;
        console.log(`Transaction hash: ${hx}`);
        alert(`Transaction hash: ${hx}`);
      }
    }
  };

  return (
    <div className="mx-auto my-10 max-w-xl rounded-lg border border-gray-200 p-6 dark:border-gray-800">
      <h1 className="mb-6 text-2xl font-bold">Create a business account</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 flex flex-col space-y-4">
          <label className="font-medium" htmlFor="name">
            Name
          </label>
          <Input
            id="name"
            placeholder="Name of your business"
            className={overrideDarkStyles}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="mb-4 flex flex-col space-y-4">
          <label className="font-medium" htmlFor="description">
            Description
          </label>
          <Textarea
            id="description"
            placeholder="Describe your business"
            className={overrideDarkStyles}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="mb-6 flex flex-col space-y-4">
          <label className="font-medium" htmlFor="tags">
            Tags
          </label>
          <Input
            id="tags"
            placeholder="Enter tags"
            className={overrideDarkStyles}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button className="w-full" disabled={isLoading}>
          Create Account
        </Button>
      </form>
      {/*<Button className="w-full" onClick={getBizOwnerContract}>
        Get Biz Owner Contract
      </Button>

      <Button className="w-full" onClick={testingStarknetJs}>
        Testing Starknet JS
      </Button>
      
      <form onSubmit={aproveAndDepositToContract}>
        <Button className="w-full">Approve and Deposit</Button>
      </form>
      */}
    </div>
  );
}
