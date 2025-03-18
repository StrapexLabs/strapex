"use client";
import React, { useEffect, useState } from "react";
import { CallData, Contract, cairo, num, BigNumberish } from "starknet";

import abi from "../abis/abi.json";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProvider } from "@/contexts/ProviderContext";
import { useUser } from "@/contexts/UserContext";
import { saveBusinessData } from "@/services/databaseService";
import { BizWallet } from "@/types";

// Add additional styles for overriding dark mode background
const overrideDarkStyles =
  "dark:bg-white dark:border-gray-200 dark:placeholder:text-gray-500";

import { usePathname, useRouter } from "next/navigation";

import { getRoute } from "@/utils/getRoute";
function generateApiKey() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

const FACTORY_ADDRESSES: { [key: string]: string | undefined } = {
  mainnet: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS,
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS,
};

export function BizForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const userContext = useUser();
  const providerContext = useProvider();

  //If the component loads and the user is not logged in, we call the userContext.login()
  useEffect(() => {
    if (!userContext?.isLoggedIn) {
      userContext?.login();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const apiKey = generateApiKey();
    console.log(apiKey);
    if (!userContext?.address) {
      alert("Please connect your wallet first!");
      return;
    }
    try {
      setIsLoading(true); // Set loading state to true
      const contractAddress = await createContract();
      if (contractAddress) {
        const businessData: BizWallet = {
          name,
          description,
          tags,
          apiKey,
          ownerAddress: userContext.address,
          contractAddress,
          createdAt: new Date(),
        };
        await saveBusinessData(businessData, providerContext);
        alert("Business data saved successfully!");
        router.push(getRoute("/accounts", pathname)); // Redirect to account page
      }
    } catch (error) {
      console.error("Error saving business data or executing contract:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false); // Set loading state back to false
    }
  };

  const createContract = async () => {
    if (!userContext?.address) {
      alert("Please connect your wallet first!");
      return;
    }

    const factoryAddress = FACTORY_ADDRESSES[providerContext?.network || ""];
    if (!factoryAddress) {
      alert("Factory contact missing in env");
      return;
    }

    const transactions = [
      {
        contractAddress: factoryAddress,
        entrypoint: "create_strapex_contract",
        calldata: [],
      },
    ];

    // Placeholder for ABI and transaction details, adjust as necessary
    //const abi = undefined; // Define if you have ABI details
    const transactionsDetail = {
      maxFee: undefined, // Define if you have a max fee
      nonce: undefined, // Define if you have a nonce
      version: 1, // Use default or specify if different
    };

    if (userContext?.account) {
      const multiCall = await userContext.account.execute(transactions);
      if (multiCall) {
        const hx = multiCall.transaction_hash;
        console.log(`Transaction hash: ${hx}`);
        alert(`Transaction hash: ${hx}`);
        console.log("Multicall", multiCall);
        const result = await providerContext?.provider.waitForTransaction(
          multiCall.transaction_hash,
        );
        console.log("Result", result);
        if (result && result.events.length > 0) {
          const contractAddress = result.events[0].keys[3];
          console.log(`Deployed Strapex contract address: ${contractAddress}`);
          alert(`Deployed Strapex contract address: ${contractAddress}`);
          return contractAddress; // Return the contract address
        }
      }
    }
    return null; // Return null if contract deployment fails
  };

  const getBizOwnerContract = async () => {
    if (!userContext?.address) {
      alert("Please connect your wallet first!");
      return;
    }

    const factoryAddress = FACTORY_ADDRESSES[providerContext?.network || ""];
    if (!factoryAddress) {
      alert("Factory contact missing in env");
      return;
    }

    const mycontract = new Contract(
      abi,
      factoryAddress,
      providerContext?.provider,
    );

    const me = await mycontract.getUserStrapexAccount(userContext?.address);
    const stringAddress = num.toHex(me);
    alert(`Your Strapex contract address is: ${stringAddress}`);
  };

  const testingStarknetJs = async () => {
    const factoryAddress = FACTORY_ADDRESSES[providerContext?.network || ""];
    if (!factoryAddress) {
      alert("Factory contact missing in env");
      return;
    }

    const myTestContract = new Contract(
      abi,
      factoryAddress,
      providerContext?.provider,
    );
    const result = myTestContract.test();
    console.log(result);
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
      {/*
      <Button className="w-full" onClick={getBizOwnerContract}>
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
