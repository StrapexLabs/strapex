"use client";
import {
  CopyIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Code,
  DataList,
  DropdownMenu,
  Flex,
  IconButton,
} from "@radix-ui/themes";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Realm from "realm-web";

import { app } from "../../../../realmconfig";

import BizWalletCard from "@/components/bizWalletCard";
import CreateProductModal from "@/components/createProductModal";
import { useProvider } from "@/contexts/ProviderContext";
import { useUser } from "@/contexts/UserContext";
import {
  getBusinessAccountsByOwner,
  getDatabaseName,
  getSubscriptionsByProductIds,
} from "@/services/databaseService";
import { Token, fetchTokenBalances } from "@/services/tokenService";
import { BizWallet, BizWalletWithBalance, Item, Product, SessionData } from "@/types";


import { generateUniqueSessionId, hexToDate } from "@/utils/helpers";

export default function Accounts() {
  const userContext = useUser();
  const [businessAccounts, setBusinessAccounts] = useState<
    BizWalletWithBalance[]
  >([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  {
    /* Refetch button */
  }
  const [shouldRefetch, setShouldRefetch] = useState(false);

  const handleRefetch = () => {
    setShouldRefetch(!shouldRefetch);
  };

  const providerContext = useProvider();
  useEffect(() => {
    const fetchData = async () => {
      if (userContext?.address) {
        try {
          const accounts = await getBusinessAccountsByOwner(
            userContext.address,
            providerContext,
          );
          const accountsWithBalances: BizWalletWithBalance[] =
            await Promise.all(
              accounts.map(async (account) => {
                const balances = await fetchTokenBalances(
                  account.contractAddress,
                  providerContext.provider,
                );
                return {
                  ...account,
                  balances,
                };
              }),
            );
          setBusinessAccounts(accountsWithBalances);

          const totalBalance = accountsWithBalances.reduce(
            (sum, account) =>
              sum +
              account.balances.reduce((acc, token) => acc + token.balance, 0),
            0,
          );
          setTotalBalance(totalBalance);

          const dbName = getDatabaseName(providerContext);
          if (!dbName) {
            throw new Error("Database name is undefined");
          }
          const mongodb = app.currentUser?.mongoClient("mongodb-atlas");
          const collection = mongodb?.db(dbName).collection("products");

          const userProducts = await collection?.find({
            owner: userContext.address,
          });
          setProducts(userProducts ?? []);

          // Fetch subscriptions
          const productIds =
            userProducts
              ?.map((product: Product) => product._id?.toString())
              .filter((id): id is string => id !== undefined) ?? [];
          const userSubscriptions = await getSubscriptionsByProductIds(
            productIds,
            providerContext,
          );
          for (const subscription of userSubscriptions) {
            subscription.timestampsLeft = subscription.timestampsLeft.map(
              (timestamp: string) => hexToDate(timestamp),
            );
            if (subscription.payRecord && subscription.payRecord.length > 0) {
              const latestPayment = subscription.payRecord.reduce(
                (latest: any, record: any) => {
                  return parseInt(record.timestamp, 16) >
                    parseInt(latest.timestamp, 16)
                    ? record
                    : latest;
                },
                subscription.payRecord[0],
              );
              subscription.latestPaymentDate = hexToDate(
                latestPayment.timestamp,
              );
              subscription.latestPaymentHash = latestPayment.txHash; // Add latestPaymentHash
            } else {
              subscription.latestPaymentDate = null;
              subscription.latestPaymentHash = null; // Add latestPaymentHash
            }
          }
          console.log(userSubscriptions);
          setSubscriptions(userSubscriptions ?? []);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    fetchData();
  }, [userContext?.address, shouldRefetch]);

  const handleDeleteProduct = async (productId: ObjectId | undefined) => {
    if (!productId) {
      alert("Product ID is undefined");
      return;
    }
    try {
      const dbName = getDatabaseName(providerContext);
      if (!dbName) {
        throw new Error("Database name is undefined");
      }
      const mongodb = app.currentUser?.mongoClient("mongodb-atlas");
      console.log(dbName);
      const collection = mongodb?.db(dbName).collection("products");

      const result = await collection?.deleteOne({ _id: productId });

      setProducts((prevProducts) =>
        prevProducts.filter(
          (product) => product._id?.toString() !== productId.toString(),
        ),
      );
      setShouldRefetch(true);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const createPaymentLink = async (product: Product) => {
    const dbName = getDatabaseName(providerContext);
    if (!dbName) {
      throw new Error("Database name is undefined");
    }
    console.log(product);
    const mongodb = app.currentUser?.mongoClient("mongodb-atlas");
    const collection = mongodb?.db(dbName).collection("sessions");

    const item: Item = {
      id: product._id?.toString(),
      price: product.price,
      quantity: 1,
      name: product.name,
      currency: "ETH",
    };

    const totalPrice = item.price;
    const totalPriceToken = item.currency;
    const sessionId = generateUniqueSessionId();

    const sessionData: SessionData = {
      sessionId: sessionId,
      totalPrice: totalPrice,
      totalPriceToken: totalPriceToken,
      payment_type: product.payment_type,
      successUrl: "https://strapex.org/",
      cancelUrl: "https://strapex.org/",
      lineItems: [item],
      depositAddress: product.address,
      status: "pending",
    };

    try {
      await collection?.insertOne(sessionData);
      console.log("Session created successfully:", sessionData);

      const domain =
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://pay.strapex.org";
      const networkPath = providerContext.network === "sepolia" ? "/test" : "";
      alert(`${domain}${networkPath}/p/${sessionId}`);
    } catch (error: any) {
      console.error("Error creating session: ", error);
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex w-full flex-row items-center justify-between">
        <h1 className="mb-8 text-3xl font-bold">Account</h1>
        <div className="flex flex-row items-center space-x-2">
          <CreateProductModal
            addresses={businessAccounts.map(
              (account) => account.contractAddress,
            )}
          />
          <Button
            onClick={handleRefetch}
            className=""
            color="gray"
            variant="ghost"
          >
            <ReloadIcon />
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Total Balance</h2>
        <p className="text-lg">{totalBalance}</p>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {businessAccounts.map((account: BizWalletWithBalance) => (
          <Link
            key={account.contractAddress}
            href={`/accounts/${account.contractAddress}`}
          >
            <div>
              <BizWalletCard account={account} />
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Products</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product._id?.toString()}
              className="rounded bg-white p-4 shadow"
            >
              <div className="mb-4 flex items-center">
                <h3 className="mb-2 text-lg font-bold">{product.name}</h3>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton
                      color="gray"
                      variant="ghost"
                      className="ml-auto"
                    >
                      <DotsHorizontalIcon />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item
                      onSelect={() => handleDeleteProduct(product._id)}
                    >
                      Delete
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => createPaymentLink(product)}
                    >
                      Create Payment Link
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
              <p>Type: {product.payment_type}</p>
              <p>Price: {product.price} ETH</p>
              <p>Address: {product.address}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Subscribers</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((subscription) => (
            <div key={subscription._id} className="rounded bg-white p-4 shadow">
              <DataList.Root>
                <DataList.Item align="center">
                  <DataList.Label minWidth="88px">User</DataList.Label>
                  <DataList.Value>
                    <Flex align="center" gap="2">
                      <Code variant="ghost">
                        {`${subscription.fromUser.slice(0, 4)}...${subscription.fromUser.slice(-4)}`}
                      </Code>
                      <IconButton
                        size="1"
                        aria-label="Copy value"
                        color="gray"
                        variant="ghost"
                      >
                        <CopyIcon />
                      </IconButton>
                    </Flex>
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="88px">Status</DataList.Label>
                  <DataList.Value>
                    <Badge
                      color={
                        subscription.status === "canceled" ? "ruby" : "jade"
                      }
                      variant="soft"
                      radius="full"
                    >
                      {subscription.status === "canceled"
                        ? "Canceled"
                        : "Active"}
                    </Badge>
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="88px">Product</DataList.Label>
                  <DataList.Value>{subscription.productId}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="88px">Last paid</DataList.Label>
                  <DataList.Value>
                    <Link
                      href={`https://sepolia.voyager.online/tx/${subscription.latestPaymentHash}`}
                    >
                      {subscription.latestPaymentDate}
                      <ExternalLinkIcon />
                    </Link>
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="88px">Next payment</DataList.Label>
                  <DataList.Value>
                    {subscription.status === "canceled"
                      ? "--"
                      : subscription.timestampsLeft[0]}
                  </DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
