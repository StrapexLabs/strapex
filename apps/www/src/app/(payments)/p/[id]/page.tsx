"use client";
import {
  fetchQuotes,
  Quote,
  QuoteRequest,
  fetchBuildExecuteTransaction,
} from "@avnu/avnu-sdk";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  Flex,
  RadioCards,
  Skeleton,
  ChevronDownIcon,
  Text,
} from "@radix-ui/themes";
import dotenv from "dotenv";
import { formatUnits, parseUnits } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import React, { use, useEffect, useState } from "react";
import {
  Account,
  BigNumberish,
  CallData,
  Uint256,
  cairo,
  uint256,
} from "starknet";
import { StarknetWindowObject, connect, disconnect } from "starknetkit";

import ShippingAddressForm, {
  ShippingAddress,
} from "../../../../components/shippingAddressForm";
import tokensList from "../../../../lib/tokens.json";
import { fetchTokenBalances } from "../../../../services/tokenService";
import { Balance, SessionData, Payment_type, Token } from "../../../../types";
import { delay, formatSignificantDigits } from "../../../../utils/helpers";

import ContactInformationForm, {
  ContactInformation,
} from "@/components/contactInformationForm";

import "./accordion.css";

import { useProvider } from "@/contexts/ProviderContext";

import {
  isContactInformationFilled,
  isShippingAddressFilled,
} from "../../../../utils/filledChecker";

import { getDatabaseName } from "@/services/databaseService";

dotenv.config();
interface CheckoutPageProps {
  params: { id: string };
}

type TotalPrice = {
  priceInBaseToken: bigint;
  baseTokenAddress: string;
  baseTokenTicker: string;
  baseTokenDecimals: number;
  priceInUSDC: bigint;
};

type TokenToPayWith = {
  tokenAddress: string;
  quoteId: string;
  slippage?: number;
  executeApprove?: boolean;
  options?: any;
};

const AVNU_OPTIONS = { baseUrl: "https://starknet.api.avnu.fi" };

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { id: sessionId } = params;
  const [connection, setConnection] = useState<StarknetWindowObject | null>(
    null,
  );
  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressBalances, setAddressBalances] = useState<Balance[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [prependedSwapCalls, setPrependedSwapCalls] = useState<any[]>([]);
  const [tokenToPayWith, setTokenToPayWith] = useState<TokenToPayWith | null>(
    null,
  );
  const [qrContent, setQrContent] = useState<string | null>(null);

  {
    /* Provider */
  }
  const providerContext = useProvider();

  {
  }

  {
    /* Prices */
  }
  const [priceInToken, setPriceInToken] = useState<TotalPrice | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isTokenSelectionOpen, setIsTokenSelectionOpen] =
    useState<boolean>(false);
  const [quotesLoading, setQuotesLoading] = useState<boolean>(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  {
    /*Modals  */
  }
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  {
    /* Shipping and contact information */
  }
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress | null>(null);
  const [contactInformation, setContactInformation] =
    useState<ContactInformation | null>(null);

  {
    /* Recurrent */
  }
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  {
    /* Accordeon */
  }
  const [activeSection, setActiveSection] = useState("item-1");
  const handleNextClick = (currentSection: string) => {
    console.log("Next button clicked in section:", currentSection);
    // If validation passes, move to the next section
    const nextSection = currentSection === "item-1" ? "item-2" : "item-3";
    setActiveSection(nextSection);
  };

  useEffect(() => {
    if (!activeSection) {
      const timeoutId = setTimeout(() => {
        if (!activeSection) {
          setActiveSection("item-3");
        }
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [activeSection]);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const dbName = getDatabaseName(providerContext);

        const response = await fetch(
          `/api/session?sessionId=${sessionId}&db_name=${dbName}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch session data");
        }
        const data = await response.json();
        setSessionData(data);

        if (data.shipping_address_collection !== "required") {
          setActiveSection("item-3");
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };
    fetchSessionData();
  }, [sessionId, providerContext?.network]);

  const connectToStarknet = async () => {
    await disconnect();
    await delay(1000);
    const { wallet, connector, connectorData } = await connect({
      modalMode: "alwaysAsk",
      dappName: "Strapex",
      modalTheme: "dark",
    });
    console.log("Attempting to connect");
    if (wallet && wallet?.isConnected) {
      setConnection(wallet);
      setAccount(wallet?.account);
      setAddress(connectorData?.account!);
    } else {
      return;
    }
  };

  const payWithStarknet = async () => {
    if (!sessionData) {
      alert("No session data found");
      return;
    }

    if (sessionData.status === "justRequiringInfo") {
      // Send the shipping address and contact information data to the server
      if (shippingAddress || contactInformation) {
        console.log(
          "Sending shipping address and contact information to the server:",
          { shippingAddress, contactInformation },
        );
        try {
          const response = await fetch("/api/add-billing-address", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
              shippingAddress,
              contactInformation,
              tx_hash: "to add manually",
            }),
          });

          if (!response.ok) {
            throw new Error(
              "Failed to update shipping address and contact information",
            );
          }

          console.log(
            "Shipping address and contact information updated successfully",
          );

          // Send an email with the updated information
          try {
            const emailResponse = await fetch("/api/sendEmailInvoice", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId }),
            });

            if (!emailResponse.ok) {
              throw new Error("Failed to send email");
            }

            console.log("Email sent successfully");
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        } catch (error) {
          console.error(
            "Error updating shipping address and contact information:",
            error,
          );
        }
      }
      // Display the modal
      setShowModal(true);

      // Wait for 5 seconds
      await delay(5000);

      // Redirect to the success URL
      window.location.href = sessionData.successUrl;
      return;
    }

    if (!account) {
      alert("No account found");
      return;
    }

    if (!priceInToken) {
      alert("No price found");
      return;
    }

    // Check if contractInfo and shippingAddress data is filled in
    if (
      sessionData.shipping_address_collection === "required" &&
      !shippingAddress
    ) {
      alert("Please fill in the shipping address");
      return;
    }

    if (
      sessionData.shipping_address_collection === "required" &&
      (!contactInformation ||
        !isContactInformationFilled(contactInformation as ContactInformation))
    ) {
      alert("Please fill in the contact information");
      return;
    }

    if (
      sessionData.shipping_address_collection === "required" &&
      !isShippingAddressFilled(shippingAddress as ShippingAddress)
    ) {
      alert("Please fill in the shipping address");
      return;
    }

    const address = sessionData.depositAddress;
    const amount = sessionData.totalPrice;
    const wei = BigInt(priceInToken.priceInBaseToken);
    const id: BigNumberish = 1;
    const baseTokenAddress = priceInToken.baseTokenAddress;

    console.log(`Wei: ${wei}`);
    console.log(`Address: ${address}`);

    console.log("Prepended call", prependedSwapCalls);

    const transactions = [
      ...prependedSwapCalls,
      {
        contractAddress: baseTokenAddress,
        entrypoint: "approve",
        // approve the amount for bridge
        calldata: CallData.compile({
          spender: address,
          amount: cairo.uint256(wei),
        }),
      },
      {
        contractAddress: address,
        entrypoint: "deposit",
        // transfer the amount to the contract address
        calldata: CallData.compile({
          id: id,
          amount: cairo.uint256(wei),
          //  tokenAddress: baseTokenAddress,
        }),
      },
    ];
    // TODO: Prepend calls of the multi_swap

    console.log(`Transactions: ${JSON.stringify(transactions, null, 2)}`);
    const multiCall = await account.execute(transactions);
    console.log(`MultiCall: ${multiCall}`);
    if (multiCall) {
      const tx_hash = multiCall.transaction_hash;
      console.log(`Transaction hash: ${tx_hash}`);

      // Send the shipping address and contact information data to the server
      if (shippingAddress || contactInformation) {
        console.log(
          "Sending shipping address and contact information to the server:",
          { shippingAddress, contactInformation },
        );
        try {
          const response = await fetch("/api/add-billing-address", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
              shippingAddress,
              contactInformation,
              tx_hash,
            }),
          });

          if (!response.ok) {
            throw new Error(
              "Failed to update shipping address and contact information",
            );
          }

          console.log(
            "Shipping address and contact information updated successfully",
          );

          // Send an email with the updated information
          try {
            const emailResponse = await fetch("/api/sendEmailInvoice", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId }),
            });

            if (!emailResponse.ok) {
              throw new Error("Failed to send email");
            }

            console.log("Email sent successfully");
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        } catch (error) {
          console.error(
            "Error updating shipping address and contact information:",
            error,
          );
        }
      }
      // Display the modal
      setShowModal(true);

      // Wait for 5 seconds
      await delay(5000);

      // Redirect to the success URL
      window.location.href = sessionData.successUrl;
    }
  };

  //When detecting a change in address, the goal is to fetch the balances of the address so the user can choose to pay with "any coin"
  useEffect(() => {
    if (address) {
      console.log("Address", address);
      console.log(
        "Provider",
        providerContext.provider,
        providerContext.network,
      );
      fetchTokenBalances(address, providerContext.provider).then((balances) => {
        console.log("Balances", balances);
        setAddressBalances(balances);
        setQuotesLoading(true);
      });
    }
  }, [address]);

  useEffect(() => {
    if (addressBalances) {
      getQuotes().then(() => {
        // Open the select token modal
        setIsTokenSelectionOpen(true);
        console.log("Token selection modal", isTokenSelectionOpen);

        // Start the interval to refresh quotes every 5 seconds
        const id = setInterval(getQuotes, 5000);
        setIntervalId(id);
      });
    }

    // Clean up the interval when the component unmounts or addressBalances changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [addressBalances]);

  useEffect(() => {
    // Ensure quotes are fetched every 5 seconds
    if (intervalId) {
      const id = setInterval(getQuotes, 5000);
      return () => clearInterval(id);
    }
  }, [intervalId]);

  // For the qe
  useEffect(() => {
    if (sessionData) {
      calculateQrContent();
    }
  }, [sessionData]);

  async function getQuotes() {
    if (!priceInToken || !priceInToken.priceInBaseToken || !address) {
      return;
    }

    const baseTokenAddress = priceInToken.baseTokenAddress;
    let baseTokenAmount = priceInToken.priceInBaseToken;
    // Add a 1.01 buffer to the amount
    baseTokenAmount = BigInt(Math.floor(Number(baseTokenAmount) * 1.01));

    const quotePromises = addressBalances.map(async (balance) => {
      const tokenAddress = balance.address;
      console.log(baseTokenAmount);
      if (tokenAddress !== baseTokenAddress) {
        const params: QuoteRequest = {
          sellTokenAddress: baseTokenAddress,
          buyTokenAddress: tokenAddress,
          sellAmount: baseTokenAmount,
          takerAddress: address,
        };

        const quotes = await fetchQuotes(params, AVNU_OPTIONS);
        const amountOfTokenIneed = quotes[0].buyAmount;

        const params2: QuoteRequest = {
          sellTokenAddress: tokenAddress,
          buyTokenAddress: baseTokenAddress,
          sellAmount: amountOfTokenIneed,
          takerAddress: address,
        };

        const quotes2 = await fetchQuotes(params2, AVNU_OPTIONS);
        return quotes2[0];
      }
    });

    const tempQuotes = await Promise.all(quotePromises);
    console.log(tempQuotes);
    setQuotes(
      tempQuotes.filter((quote): quote is Quote => quote !== undefined),
    );
    setQuotesLoading(false);
  }

  {
    /* Calculate aproximate of the price in token in USDC */
  }
  useEffect(() => {
    const usdcAddress =
      "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
    const sellTokenTicker = sessionData ? sessionData.totalPriceToken : "USDC";

    const sellTokenData = (tokensList as Token[]).find(
      (token: Token) => token.ticker === sellTokenTicker,
    );
    const sellTokenAddress = sellTokenData ? sellTokenData.address : undefined;
    const sellTokenDecimals = sellTokenData ? sellTokenData.decimals : 6;
    const sellAmount = sessionData
      ? parseUnits(sessionData.totalPrice.toString(), sellTokenDecimals)
      : undefined;

    if (!sellAmount || !sellTokenAddress) {
      return;
    }

    const params: QuoteRequest = {
      sellTokenAddress: sellTokenAddress,
      buyTokenAddress: usdcAddress,
      sellAmount: sellAmount,
    };

    fetchQuotes(params, AVNU_OPTIONS).then((quotes) => {
      setPriceInToken({
        priceInBaseToken: quotes[0].sellAmount,
        baseTokenAddress: quotes[0].sellTokenAddress,
        baseTokenTicker: sellTokenTicker,
        baseTokenDecimals: sellTokenDecimals,
        priceInUSDC: quotes[0].buyAmount,
      });
      console.log("Price in token", priceInToken);
    });
  }, [sessionData]);

  function fetchAndSetPrependedSwapCalls(
    tokenAddress: string,
    slippage = 0.005,
    executeApprove = true,
    options = AVNU_OPTIONS,
  ) {
    if (!account) {
      alert("No account found");
      return;
    }

    if (!priceInToken) {
      alert("No price found");
      return;
    }

    console.log(
      "Set coin to pay with:",
      tokenAddress,
      slippage,
      executeApprove,
      options,
    );

    // If it's the base token dont do anything
    const normalizedBaseTokenAddress = priceInToken?.baseTokenAddress
      .slice(-63)
      .toUpperCase();
    const normalizedTokenAddress = tokenAddress.slice(-63).toUpperCase();

    if (normalizedTokenAddress === normalizedBaseTokenAddress) {
      setTokenToPayWith({
        tokenAddress: priceInToken?.baseTokenAddress,
        quoteId: "lmao",
      });
      setPrependedSwapCalls([]);
      return;
    }

    const quote = quotes.find(
      (q) =>
        q.sellTokenAddress.slice(-63).toUpperCase() ===
          normalizedTokenAddress ||
        q.buyTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress,
    );
    if (!quote) {
      alert("No quote found for the selected token");
      return;
    }

    setTokenToPayWith({
      tokenAddress: tokenAddress,
      quoteId: quote.quoteId,
    });
    console.log("quoteId to build transaction", quote.quoteId);
    fetchBuildExecuteTransaction(
      quote.quoteId,
      account.address,
      slippage,
      executeApprove,
      options,
    ).then((transaction) => {
      console.log("Just selected a token, prepend calls", transaction.calls);
      setPrependedSwapCalls(transaction.calls);
    });
  }

  function calculateQrContent() {
    if (!sessionData) {
      console.log("No session data found");
      return;
    }

    const amount: Uint256 = uint256.bnToUint256(
      BigInt(sessionData.totalPrice * 1e18),
    );

    const sessionId = sessionData.sessionId;

    const depositCall = {
      contractAddress: sessionData.depositAddress,
      entrypoint: "deposit",
      calldata: CallData.compile({
        id: 1,
        amount: amount,
      }),
    };

    const periodicty = 2678400; //1 month
    const minimumEpochs = 3; //1 motnhs x 3 = 3 epochs

    const payload = {
      transferCall: depositCall,
      periodicity: periodicty,
      minimumEpochs: minimumEpochs,
      sessionId: sessionId,
    };
    console.log("QR Content", JSON.stringify(payload));
    setQrContent(JSON.stringify(payload));
  }

  {
    /* This is for the qr part and listen to the updates from the phone */
  }
  const fetchSessionStatus = async (sessionId: string, dbName: string) => {
    try {
      const response = await fetch(
        `/api/session/?sessionId=${sessionId}&db_name=${dbName}`,
      );
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error("Error fetching session status:", error);
      return null;
    }
  };

  {
    /* This is for the qr part and listen to the updates from the phone */
  }
  useEffect(() => {
    if (sessionData) {
      const fetchStatus = async () => {
        const dbName = getDatabaseName(providerContext);
        if (dbName) {
          const status = await fetchSessionStatus(
            sessionData.sessionId,
            dbName,
          );
          setSessionStatus(status);
        }
      };

      fetchStatus(); // Initial fetch

      const id = setInterval(fetchStatus, 3000); // Fetch every 3 seconds
      setIntervalId(id);
    }

    // Clean up the interval when the component unmounts or sessionData changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sessionData]);

  {
    /* This is for the qr part and listen to the updates from the phone */
  }
  useEffect(() => {
    if (sessionStatus === "completed") {
      console.log("Session status", sessionStatus);
      setShowModal(true);
    }
  }, [sessionStatus]);

  if (sessionData && sessionData.status === "completed") {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Payment Already Completed</h1>
        <p className="text-lg">This session has already been paid for.</p>
        <p className="text-md mt-2">
          If you encounter any issues, please contact{" "}
          <a
            href="mailto:support@strapex.org"
            className="text-blue-500 hover:underline"
          >
            support@strapex.org
          </a>
          .
        </p>
        <a
          href="https://strapex.org"
          className="mt-4 text-blue-500 hover:underline"
        >
          Go to Home
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <div className="flex w-full flex-col bg-neutral-800 p-16 p-8 text-neutral-100 md:w-1/2">
        <a href="https://starknetstore.com">
          <img
            src="/strapex-white.png"
            alt="checkout"
            className="mb-8 h-[30px] w-auto"
          />
        </a>
        {sessionData ? (
          <>
            <div className="grow rounded border-b">
              <h2 className="mb-4 text-2xl font-bold">Items:</h2>
              <ul className="space-y-4">
                {sessionData.lineItems.map((item, index) => (
                  <li key={index} className="border-b pb-4">
                    <p className="font-semibold">{item.name}</p>
                    <p>
                      Price: {item.price} {item.currency}
                    </p>
                    <p>Quantity: {item.quantity}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 self-end">
              <p className="text-lg font-semibold">
                Total Price: {sessionData.totalPrice}
              </p>
            </div>
          </>
        ) : (
          <p className="text-xl">Loading line items...</p>
        )}
      </div>
      <div className="flex w-full flex-col items-center justify-between md:w-1/2 md:p-8">
        {/*Go back button*/}
        {sessionData && (
          <div className="flex flex-row items-center self-start p-4 md:p-0">
            <a
              href={sessionData.cancelUrl}
              className="flex flex-row items-center"
            >
              <ChevronLeftIcon className="mr-2 inline-block size-4" />
              <p>Go back</p>
            </a>
          </div>
        )}

        {sessionData ? (
          <>
            {sessionData.payment_type === "recurring" && qrContent ? (
              <div className="flex w-full max-w-md flex-col items-center justify-center space-y-4 rounded p-6">
                <h3 className="mb-4 text-2xl font-bold">Scan QR Code to Pay</h3>
                <QRCodeSVG value={qrContent} height={256} width={256} />
                <span>Get the Strapex App</span>
                <img
                  src="/StrapexAppIcon.png"
                  alt="Strapex App"
                  className="h-12"
                />
                <div className="flex flex-row space-x-4">
                  <a
                    href="https://apps.apple.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="/DownloadOnTheAppstore.png"
                      alt="Download on the App Store"
                      className="h-12"
                    />
                  </a>
                  <a
                    href="https://play.google.com/store"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="/GetItOnGooglePlay.png"
                      alt="Get it on Google Play"
                      className="h-12"
                    />
                  </a>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md rounded p-6">
                <Accordion.Root
                  className="AccordionRoot"
                  type="single"
                  defaultValue="item-1"
                  collapsible
                  value={activeSection}
                  onValueChange={setActiveSection}
                >
                  {/* Shipping Address Form */}
                  {sessionData.shipping_address_collection == "required" && (
                    <Accordion.Item className="AccordionItem" value="item-1">
                      <Accordion.AccordionHeader className="AccordionHeader py-4">
                        <Accordion.AccordionTrigger className="AccordionTrigger flex w-full flex-row items-center justify-between">
                          <h3 className="text-2xl font-bold">
                            Contact Information
                          </h3>
                          <ChevronDownIcon
                            className="AccordionChevron"
                            aria-hidden
                          />
                        </Accordion.AccordionTrigger>
                      </Accordion.AccordionHeader>
                      <Accordion.AccordionContent className="AccordionContent">
                        <ContactInformationForm
                          setContactInformation={setContactInformation}
                          contactInformation={
                            contactInformation as ContactInformation
                          }
                          handleNextClick={() => handleNextClick("item-1")}
                        />
                      </Accordion.AccordionContent>
                    </Accordion.Item>
                  )}

                  {/* Shipping Address Form */}
                  {sessionData.shipping_address_collection == "required" && (
                    <Accordion.Item className="AccordionItem" value="item-2">
                      <Accordion.AccordionHeader className="AccordionHeader py-4">
                        <Accordion.AccordionTrigger className="AccordionTrigger flex w-full flex-row items-center justify-between">
                          <h3 className="text-2xl font-bold">
                            Shipping Address
                          </h3>
                          <ChevronDownIcon
                            className="AccordionChevron"
                            aria-hidden
                          />
                        </Accordion.AccordionTrigger>
                      </Accordion.AccordionHeader>
                      <Accordion.AccordionContent className="AccordionContent">
                        <ShippingAddressForm
                          shippingAddress={shippingAddress as ShippingAddress}
                          setShippingAddress={setShippingAddress}
                          handleNextClick={() => handleNextClick("item-2")}
                        />
                      </Accordion.AccordionContent>
                    </Accordion.Item>
                  )}

                  {/* qrZone */}
                  {sessionData.payment_type === "recurring" && qrContent && (
                    <QRCodeSVG value={qrContent} height={256} width={256} />
                  )}

                  <Accordion.Item className="AccordionItem" value="item-3">
                    <Accordion.AccordionHeader className="AccordionHeader py-4">
                      <Accordion.AccordionTrigger className="AccordionTrigger flex w-full flex-row items-center justify-between">
                        <h3 className="text-2xl font-bold">Payment</h3>
                        <ChevronDownIcon
                          className="AccordionChevron"
                          aria-hidden
                        />
                      </Accordion.AccordionTrigger>
                    </Accordion.AccordionHeader>
                    <Accordion.AccordionContent className="AccordionContent space-y-4">
                      <div className="flex flex-row items-center justify-between rounded border border-gray-200 p-4">
                        <div>
                          {sessionData.totalPrice && priceInToken && (
                            <div className="flex flex-col text-sm">
                              <p>Total Price</p>
                              <p className="text-xl font-semibold">
                                {formatSignificantDigits(
                                  formatUnits(
                                    priceInToken.priceInBaseToken,
                                    priceInToken.baseTokenDecimals,
                                  ),
                                )}{" "}
                                {priceInToken.baseTokenTicker}
                              </p>
                              <span className="text-sm text-gray-500">
                                {" "}
                                ≈{" "}
                                {formatSignificantDigits(
                                  formatUnits(priceInToken.priceInUSDC, 6),
                                )}{" "}
                                USD
                              </span>
                            </div>
                          )}
                        </div>

                        {account ? (
                          <Dialog.Root
                            open={isTokenSelectionOpen}
                            onOpenChange={(isOpen) =>
                              setIsTokenSelectionOpen(isOpen)
                            }
                          >
                            <Dialog.Trigger>
                              {tokenToPayWith == null ? (
                                <Button className="bg-neutral-800">
                                  Select Payment Token
                                </Button>
                              ) : (
                                (() => {
                                  console.log(
                                    "Selected token address",
                                    tokenToPayWith.tokenAddress,
                                  );

                                  const token = tokensList.find(
                                    (token) =>
                                      token.address ===
                                      tokenToPayWith.tokenAddress,
                                  );
                                  const tokenImage = token?.image;

                                  const quoteForToken = quotes.find(
                                    (quote) =>
                                      quote.sellTokenAddress
                                        .slice(-63)
                                        .toUpperCase() ===
                                      token?.address.slice(-63).toUpperCase(),
                                  );

                                  const amountInUsd = quoteForToken
                                    ? quoteForToken.sellAmountInUsd
                                    : 0;
                                  const amount = quoteForToken
                                    ? quoteForToken.sellAmount
                                    : BigInt(0);
                                  const formattedAmount = formatUnits(
                                    amount,
                                    token?.decimals,
                                  );
                                  const formattedAmountSignificant =
                                    formatSignificantDigits(formattedAmount);

                                  return (
                                    <button className="flex flex-row items-center rounded border border-gray-200 p-2">
                                      <img
                                        src={tokenImage}
                                        alt={tokenToPayWith.tokenAddress}
                                        className="mb-2 inline-block size-6"
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm">
                                          {formattedAmountSignificant}{" "}
                                          {token?.ticker}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({amountInUsd.toFixed(2)} USD)
                                        </span>
                                      </div>
                                      <ChevronRightIcon className="size-4" />
                                    </button>
                                  );
                                })()
                              )}
                            </Dialog.Trigger>
                            <Dialog.Content maxWidth="600px">
                              <Dialog.Title>Select Payment Token</Dialog.Title>
                              <Dialog.Description size="2" mb="4">
                                Choose the token you want to use for payment.
                              </Dialog.Description>

                              <RadioCards.Root
                                defaultValue={
                                  tokenToPayWith?.tokenAddress ?? undefined
                                }
                                onValueChange={(value) =>
                                  fetchAndSetPrependedSwapCalls(value)
                                }
                                columns={{ initial: "1" }}
                              >
                                {addressBalances.map((balance, index) => {
                                  // Normalize addresses by slicing the last 63 characters
                                  const normalizedBalanceAddress =
                                    balance.address.slice(-63).toUpperCase();
                                  console.log(
                                    "Normalized balance address",
                                    normalizedBalanceAddress,
                                  );

                                  // Find the token in the tokensList based on the normalized address
                                  const token = tokensList.find(
                                    (token) =>
                                      token.address.slice(-63).toUpperCase() ===
                                      normalizedBalanceAddress,
                                  );

                                  if (
                                    token &&
                                    token.address ===
                                      priceInToken?.baseTokenAddress
                                  ) {
                                    // Handle ETH token separately
                                    const baseTokenAmount = priceInToken
                                      ? formatUnits(
                                          priceInToken.priceInBaseToken,
                                          priceInToken.baseTokenDecimals,
                                        )
                                      : "0";
                                    const formattedBaseTokenAmount =
                                      formatSignificantDigits(baseTokenAmount);
                                    const baseTokenAmountInUsd = priceInToken
                                      ? formatUnits(priceInToken.priceInUSDC, 6)
                                      : "0";
                                    console.log(
                                      "Total price by session data",
                                      sessionData.totalPrice,
                                    );

                                    const isThereEnough =
                                      balance.balance * 10 ** token.decimals >=
                                      priceInToken?.priceInBaseToken;

                                    return (
                                      <RadioCards.Item
                                        key={index}
                                        value={token.address}
                                        disabled={!isThereEnough}
                                      >
                                        <Flex direction="column" width="100%">
                                          <img
                                            src={token.image}
                                            alt={token.ticker}
                                            className="mb-2 inline-block size-6"
                                          />
                                          <Text weight="bold">
                                            {formattedBaseTokenAmount}{" "}
                                            {priceInToken?.baseTokenTicker}
                                          </Text>
                                          <Text>
                                            (
                                            {Number(
                                              baseTokenAmountInUsd,
                                            ).toFixed(2)}{" "}
                                            USD)
                                          </Text>
                                          {!isThereEnough && (
                                            <Text size="1" color="red">
                                              Not Enough Balance
                                            </Text>
                                          )}
                                        </Flex>
                                      </RadioCards.Item>
                                    );
                                  } else if (token && balance.balance > 0) {
                                    // Handle other tokens using quotes and check if balance is greater than 0
                                    const quoteForToken = quotes.find(
                                      (quote) =>
                                        quote.sellTokenAddress
                                          .slice(-63)
                                          .toUpperCase() ===
                                        normalizedBalanceAddress,
                                    );
                                    if (!quoteForToken) {
                                      return null;
                                    }
                                    console.log(
                                      "Quote for token",
                                      quoteForToken,
                                    );
                                    console.log(
                                      "Wallet token balance",
                                      balance.balance,
                                    );
                                    console.log(
                                      "Needed balance",
                                      quoteForToken?.sellAmount,
                                    );
                                    const isThereEnough =
                                      balance.balance * 10 ** token.decimals >=
                                      quoteForToken?.sellAmount;
                                    const amountInUsd = quoteForToken
                                      ? quoteForToken.sellAmountInUsd
                                      : 0;
                                    const amount = quoteForToken
                                      ? quoteForToken.sellAmount
                                      : BigInt(0);
                                    const formattedAmount = formatUnits(
                                      amount,
                                      token.decimals,
                                    );
                                    const formattedAmountSignificant =
                                      formatSignificantDigits(formattedAmount);

                                    return (
                                      <RadioCards.Item
                                        key={index}
                                        value={token.address}
                                        disabled={!isThereEnough}
                                      >
                                        <Flex direction="column" width="100%">
                                          <img
                                            src={token.image}
                                            alt={token.ticker}
                                            className="mb-2 inline-block size-6"
                                          />
                                          <Text weight="bold">
                                            {formattedAmountSignificant}{" "}
                                            {token.ticker}
                                          </Text>
                                          <Text>
                                            ({amountInUsd.toFixed(2)} USD)
                                          </Text>
                                          {!isThereEnough && (
                                            <Text size="1" color="red">
                                              Not Enough Balance
                                            </Text>
                                          )}
                                        </Flex>
                                      </RadioCards.Item>
                                    );
                                  }
                                  // Token not found in the tokensList
                                  return null;
                                })}

                                {quotesLoading ? (
                                  <Skeleton loading={true}>
                                    <RadioCards.Root>
                                      <RadioCards.Item value="dummy1">
                                        <Flex direction="column" width="100%">
                                          <Text>Loading...</Text>
                                          <Button variant="soft" color="gray">
                                            Loading...
                                          </Button>
                                          <Button variant="soft" color="gray">
                                            Loading...
                                          </Button>
                                        </Flex>
                                      </RadioCards.Item>
                                      <RadioCards.Item value="dummy2">
                                        <Flex direction="column" width="100%">
                                          <Text>Loading...</Text>
                                          <Button variant="soft" color="gray">
                                            Loading...
                                          </Button>
                                          <Button variant="soft" color="gray">
                                            Loading...
                                          </Button>
                                        </Flex>
                                      </RadioCards.Item>
                                    </RadioCards.Root>
                                  </Skeleton>
                                ) : (
                                  <></>
                                )}
                              </RadioCards.Root>
                              <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                  <Button variant="soft" color="gray">
                                    Cancel
                                  </Button>
                                </Dialog.Close>
                                <Dialog.Close>
                                  <Button
                                    className="bg-neutral-800"
                                    onClick={() =>
                                      fetchAndSetPrependedSwapCalls(
                                        tokenToPayWith?.tokenAddress ?? "",
                                      )
                                    }
                                  >
                                    Confirm
                                  </Button>
                                </Dialog.Close>
                              </Flex>
                            </Dialog.Content>
                          </Dialog.Root>
                        ) : (
                          <Button
                            onClick={connectToStarknet}
                            className="bg-neutral-800"
                            size="3"
                          >
                            <img
                              src="/walletIcon.svg"
                              alt="wallet"
                              className="mr-2 inline-block size-6 "
                            />
                            Connect Wallet
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={payWithStarknet}
                        className="w-full rounded px-6 py-3 font-semibold text-white"
                        size="3"
                        color="blue"
                        disabled={
                          account === null ||
                          priceInToken === null ||
                          tokenToPayWith === null
                        }
                      >
                        Pay
                      </Button>
                    </Accordion.AccordionContent>
                  </Accordion.Item>
                </Accordion.Root>
              </div>
            )}
          </>
        ) : (
          <p className="text-xl">Loading session data...</p>
        )}

        <footer className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center">
            <p className="text-sm">Powered by </p>
            <a href="https://strapex.org">
              <img
                src="/strapex-black.png"
                alt="checkout"
                className="ml-2 h-[16px] w-[41px]"
              />
            </a>
          </div>
          <a href="mailto:support@strapex.org" className="text-sm">
            Support
          </a>
          <a href="https://strapex.org/termsAndConditions" className="text-sm">
            Terms and Conditions
          </a>
        </footer>
      </div>
      {showModal && sessionData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded bg-white p-8 shadow">
            <h2 className="mb-4 text-2xl font-bold">Payment Successful!</h2>
            <p className="text-lg">
              Thank you for your payment. You will be redirected in 5 seconds.
            </p>
            <button
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
              onClick={() => (window.location.href = sessionData.successUrl)}
            >
              Redirect Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
