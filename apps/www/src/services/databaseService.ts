import { BSON } from "realm-web";

import { fetchTokenBalances } from "./tokenService";
import { app } from "../../realmconfig";

import { ProviderContextType } from "@/contexts/ProviderContext";
import { BizWallet, BizWalletWithBalance } from "@/types";
export const getDatabaseName = (
  providerContext: ProviderContextType | null,
) => {
  return providerContext?.network === "mainnet"
    ? process.env.NEXT_PUBLIC_MONGO_DB_NAME_MAINNET
    : process.env.NEXT_PUBLIC_MONGO_DB_NAME_TESTNET;
};

const saveBusinessData = async (
  businessData: BizWallet,
  providerContext: ProviderContextType | null,
) => {
  try {
    if (!app.currentUser) {
      throw new Error("User not logged in");
    }
    const dbName = getDatabaseName(providerContext);
    if (!dbName) {
      throw new Error("Database name not set");
    }
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const businesses = mongodb.db(dbName).collection("businesses");

    // Add userId to the businessData object
    const userId = app.currentUser.id;
    const businessDataWithUserId = { ...businessData, owner_id: userId };

    console.log("Saving business data:", businessDataWithUserId);

    await businesses.insertOne(businessDataWithUserId);

    console.log("Business data saved successfully");
  } catch (error) {
    console.error("Error saving business data:", error);
    throw error;
  }
};

const getBusinessAccountsByOwner = async (
  walletAddress: string,
  providerContext: ProviderContextType | null,
): Promise<BizWallet[]> => {
  try {
    if (!app.currentUser) {
      throw new Error("User not logged in");
    }
    const dbName = getDatabaseName(providerContext);
    if (!dbName) {
      throw new Error("Database name not set");
    }
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const businesses = mongodb.db(dbName).collection("businesses");
    const query = { ownerAddress: walletAddress };
    const businessesList = await businesses.find(query);
    console.log("Business accounts found:", businessesList);
    return businessesList;
  } catch (error) {
    console.error("Error fetching business accounts:", error);
    throw error;
  }
};

const getBusinessAccountById = async (
  contractAddress: string,
  providerContext: ProviderContextType,
): Promise<BizWalletWithBalance | null> => {
  try {
    if (!app.currentUser) {
      throw new Error("User not logged in");
    }
    const dbName = getDatabaseName(providerContext);
    if (!dbName) {
      throw new Error("Database name not set");
    }
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const businesses = mongodb.db(dbName).collection("businesses");
    const businessDoc = await businesses.findOne({ contractAddress });
    console.log("Contract address:", contractAddress);
    console.log("Business account found:", businessDoc);
    if (businessDoc) {
      const balances = await fetchTokenBalances(
        businessDoc.contractAddress,
        providerContext.provider,
      );
      console.log("Balances fetched:", balances);
      return { ...businessDoc, balances };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching business account:", error);
    throw error;
  }
};

const getSubscriptionsByProductIds = async (
  productIds: string[],
  providerContext: ProviderContextType | null,
) => {
  try {
    if (!app.currentUser) {
      throw new Error("User not logged in");
    }
    const dbName = getDatabaseName(providerContext);
    if (!dbName) {
      throw new Error("Database name not set");
    }
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const subscriptions = mongodb.db(dbName).collection("subscriptions");
    const query = { productId: { $in: productIds } };
    const subscriptionsList = await subscriptions.find(query);
    console.log("Subscriptions found:", subscriptionsList);
    return subscriptionsList;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    throw error;
  }
};
export {
  saveBusinessData,
  getBusinessAccountsByOwner,
  getBusinessAccountById,
  getSubscriptionsByProductIds,
};
