"use client"
import { Button } from "@radix-ui/themes";
import { use, useEffect, useState } from "react";
import { Account, BigNumberish, CallData, Uint256, cairo, uint256 } from "starknet";
import { StarknetWindowObject, connect, disconnect } from "starknetkit";
import dotenv from 'dotenv';
import { fetchQuotes, Quote, QuoteRequest, fetchBuildExecuteTransaction } from "@avnu/avnu-sdk";
import { formatUnits, parseUnits } from "ethers";
import React from "react";
import { ShippingAddress } from "../../../../components/shippingAddressForm";
import { delay, formatSignificantDigits } from "../../../../utils/helpers";
import tokensList from "../../../../lib/tokens.json";
import { fetchTokenBalances } from "../../../../services/tokenService";
import { Balance, SessionData, Payment_type, Token, TokenToPayWith, TotalPrice } from "../../../../types";
import { QRCodeSVG } from 'qrcode.react';
import ShippingAddressForm from "../../../../components/shippingAddressForm";
import ContactInformationForm, { ContactInformation } from "@/components/contactInformationForm";
import * as Accordion from '@radix-ui/react-accordion';
import './accordion.css';
import { ChevronDownIcon, Text } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useProvider } from "@/contexts/ProviderContext";
import { isContactInformationFilled, isShippingAddressFilled } from "../../../../utils/filledChecker";
import { getDatabaseName } from "@/services/databaseService";
import SelectPaymentTokenModal from "@/components/selectPaymentTokenModal";

dotenv.config();
interface CheckoutPageProps {
  params: { id: string; };
}

const AVNU_OPTIONS = { baseUrl: 'https://starknet.api.avnu.fi' };


export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { id: sessionId } = params;
  const [connection, setConnection] = useState<StarknetWindowObject | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressBalances, setAddressBalances] = useState<Balance[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [prependedSwapCalls, setPrependedSwapCalls] = useState<any[]>([]);
  const [tokensToPayWith, setTokensToPayWith] = useState<TokenToPayWith[]>([]);
  const [qrContent, setQrContent] = useState<string | null>(null);

  {/* Provider */ }
  const providerContext = useProvider();

  {}

  {/* Prices */ }
  const [priceInToken, setPriceInToken] = useState<TotalPrice | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isTokenSelectionOpen, setIsTokenSelectionOpen] = useState<boolean>(false);
  const [quotesLoading, setQuotesLoading] = useState<boolean>(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  {/*Modals  */}
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  {/* Shipping and contact information */ }
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [contactInformation, setContactInformation] = useState<ContactInformation | null>(null);

  {/* Recurrent */ }
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);


  {/* Accordeon */ }
  const [activeSection, setActiveSection] = useState('item-1');
  const handleNextClick = (currentSection: string) => {


    console.log('Next button clicked in section:', currentSection);
    // If validation passes, move to the next section
    const nextSection = currentSection === 'item-1' ? 'item-2' : 'item-3';
    setActiveSection(nextSection);
  };

  useEffect(() => {
    if (!activeSection) {
      const timeoutId = setTimeout(() => {
        if (!activeSection) {
          setActiveSection('item-3');
        }
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [activeSection]);



  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const dbName = getDatabaseName(providerContext);

        const response = await fetch(`/api/session?sessionId=${sessionId}&db_name=${dbName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session data");
        }
        const data = await response.json();
        setSessionData(data);

        if (data.shipping_address_collection !== "required") {
          setActiveSection('item-3');
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
    const { wallet } = await connect();
    console.log("Attempting to connect");
    if (wallet && wallet.isConnected) {
      setConnection(wallet);
      setAccount(wallet.account);
      setAddress(wallet.selectedAddress);
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
        console.log('Sending shipping address and contact information to the server:', { shippingAddress, contactInformation });
        try {
          const response = await fetch('/api/add-billing-address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              shippingAddress,
              contactInformation,
              tx_hash: "to add manually"
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update shipping address and contact information');
          }

          console.log('Shipping address and contact information updated successfully');

          // Send an email with the updated information
          try {
            const emailResponse = await fetch('/api/sendEmailInvoice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });

            if (!emailResponse.ok) {
              throw new Error('Failed to send email');
            }

            console.log('Email sent successfully');
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }

        } catch (error) {
          console.error('Error updating shipping address and contact information:', error);
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
    if (sessionData.shipping_address_collection === "required" && !shippingAddress) {
      alert("Please fill in the shipping address");
      return;
    }

    if (sessionData.shipping_address_collection === "required" && (!contactInformation || !isContactInformationFilled(contactInformation as ContactInformation))) {
      alert("Please fill in the contact information");
      return;
    }

    if (sessionData.shipping_address_collection === "required" && !isShippingAddressFilled(shippingAddress as ShippingAddress)) {
      alert("Please fill in the shipping address");
      return;
    }

    let address = sessionData.depositAddress;
    let amount = sessionData.totalPrice;
    let wei = BigInt(priceInToken.priceInBaseToken)
    let id: BigNumberish = 1;
    let baseTokenAddress = priceInToken.baseTokenAddress;

    console.log(`Wei: ${wei}`);
    console.log(`Address: ${address}`);


    console.log("Prepended call", prependedSwapCalls)

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
        console.log('Sending shipping address and contact information to the server:', { shippingAddress, contactInformation });
        try {
          const response = await fetch('/api/add-billing-address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              shippingAddress,
              contactInformation,
              tx_hash
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update shipping address and contact information');
          }

          console.log('Shipping address and contact information updated successfully');

          // Send an email with the updated information
          try {
            const emailResponse = await fetch('/api/sendEmailInvoice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });

            if (!emailResponse.ok) {
              throw new Error('Failed to send email');
            }

            console.log('Email sent successfully');
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }

        } catch (error) {
          console.error('Error updating shipping address and contact information:', error);
        }
      }
      // Display the modal
      setShowModal(true);

      // Wait for 5 seconds
      await delay(5000);

      // Redirect to the success URL
      window.location.href = sessionData.successUrl;
    }
  }

  
  //When detecting a change in address, the goal is to fetch the balances of the address so the user can choose to pay with "any coin"
  useEffect(() => {
    if (address) {
      setQuotesLoading(true);
      console.log("Address", address);
      console.log("Provider", providerContext.provider, providerContext.network);
      fetchTokenBalances(address, providerContext.provider).then((balances) => {
        console.log("Balances", balances);
        setAddressBalances(balances);
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
    setQuotes(tempQuotes.filter((quote): quote is Quote => quote !== undefined));
    setQuotesLoading(false);
  }



  {/* Calculate aproximate of the price in token in USDC */ }
  useEffect(() => {
    const usdcAddress = "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
    const sellTokenTicker = sessionData ? sessionData.totalPriceToken : 'USDC';

    const sellTokenData = (tokensList as Token[]).find((token: Token) => token.ticker === sellTokenTicker);
    const sellTokenAddress = sellTokenData ? sellTokenData.address : undefined;
    const sellTokenDecimals = sellTokenData ? sellTokenData.decimals : 6;
    const sellAmount = sessionData ? parseUnits(sessionData.totalPrice.toString(), sellTokenDecimals) : undefined;

    if (!sellAmount || !sellTokenAddress) {
      return;
    }

    const params: QuoteRequest = {
      sellTokenAddress: sellTokenAddress,
      buyTokenAddress: usdcAddress,
      sellAmount: sellAmount,
    }

    fetchQuotes(params, AVNU_OPTIONS)
      .then((quotes) => {
        setPriceInToken({
          priceInBaseToken: quotes[0].sellAmount,
          baseTokenAddress: quotes[0].sellTokenAddress,
          baseTokenTicker: sellTokenTicker,
          baseTokenDecimals: sellTokenDecimals,
          priceInUSDC: quotes[0].buyAmount,
        });
        console.log("Price in token", priceInToken);
      })
  }, [sessionData]);

  function fetchAndSetPrependedSwapCalls(
    tokenAddresses: string[],
    slippage = 0.005,
    executeApprove = true,
    options = AVNU_OPTIONS
  ) {
    if (!account) {
      alert("No account found")
      return
    }

    if (!priceInToken) {
      alert("No price found")
      return
    }

    console.log('Set coins to pay with:', tokenAddresses, slippage, executeApprove, options)

    const normalizedBaseTokenAddress = priceInToken?.baseTokenAddress.slice(-63).toUpperCase()
    
    const swapCalls: any[] = []
    const newTokensToPayWith: TokenToPayWith[] = []

    tokenAddresses.forEach(tokenAddress => {
      const normalizedTokenAddress = tokenAddress.slice(-63).toUpperCase()

      if (normalizedTokenAddress === normalizedBaseTokenAddress) {
        newTokensToPayWith.push({
          tokenAddress: priceInToken.baseTokenAddress,
          quoteId: "base_token",
        })
        return
      }

      const quote = quotes.find(q =>
        q.sellTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress ||
        q.buyTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress
      )

      if (!quote) {
        console.warn(`No quote found for token: ${tokenAddress}`)
        return
      }

      newTokensToPayWith.push({
        tokenAddress: tokenAddress,
        quoteId: quote.quoteId,
      })

      fetchBuildExecuteTransaction(quote.quoteId, account.address, slippage, executeApprove, options).then((transaction) => {
        swapCalls.push(...transaction.calls)
        setPrependedSwapCalls(prevCalls => [...prevCalls, ...transaction.calls])
      })
    })

    setTokensToPayWith(newTokensToPayWith)
  }


  function calculateQrContent() {

    if (!sessionData) {
      console.log("No session data found");
      return;
    }

    let amount: Uint256 = uint256.bnToUint256(BigInt(sessionData.totalPrice * 1e18));

    let sessionId = sessionData.sessionId;

    const depositCall = {
      contractAddress: sessionData.depositAddress,
      entrypoint: "deposit",
      calldata: CallData.compile({
        id: 1,
        amount: amount,
      }),
    }

    const periodicty = 2678400 //1 month
    const minimumEpochs = 3 //1 motnhs x 3 = 3 epochs


    let payload = {
      transferCall: depositCall,
      periodicity: periodicty,
      minimumEpochs: minimumEpochs,
      sessionId: sessionId,
    }
    console.log("QR Content", JSON.stringify(payload));
    setQrContent(JSON.stringify(payload));
  }

  {/* This is for the qr part and listen to the updates from the phone */ }
  const fetchSessionStatus = async (sessionId: string, dbName: string) => {
    try {
      const response = await fetch(`/api/session/?sessionId=${sessionId}&db_name=${dbName}`);
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Error fetching session status:', error);
      return null;
    }
  };

  {/* This is for the qr part and listen to the updates from the phone */ }
  useEffect(() => {
    if (sessionData) {
      const fetchStatus = async () => {
        const dbName = getDatabaseName(providerContext);
        if (dbName) {
          const status = await fetchSessionStatus(sessionData.sessionId, dbName);
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

  {/* This is for the qr part and listen to the updates from the phone */ }
  useEffect(() => {
    if (sessionStatus === "completed") {
      console.log("Session status", sessionStatus);
      setShowModal(true);
    }
  }, [sessionStatus]);

  if (sessionData && sessionData.status === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Payment Already Completed</h1>
        <p className="text-lg">This session has already been paid for.</p>
        <p className="text-md mt-2">If you encounter any issues, please contact <a href="mailto:support@strapex.org" className="text-blue-500 hover:underline">support@strapex.org</a>.</p>
        <a href="https://strapex.org" className="mt-4 text-blue-500 hover:underline">Go to Home</a>
      </div>
    );
  }


  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="md:w-1/2 w-full bg-neutral-800 p-8 flex flex-col text-neutral-100 p-16">
        <a href="https://starknetstore.com">
          <img src="/strapex-white.png" alt="checkout" className="w-auto h-[30px] mb-8" />
        </a>
        {sessionData ? (
          <>
            <div className="rounded border-b flex-grow">
              <h2 className="text-2xl font-bold mb-4">Items:</h2>
              <ul className="space-y-4">
                {sessionData.lineItems.map((item, index) => (
                  <li key={index} className="border-b pb-4">
                    <p className="font-semibold">{item.name}</p>
                    <p>Price: {item.price} {item.currency}</p>
                    <p>Quantity: {item.quantity}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 self-end">
              <p className="text-lg font-semibold">Total Price: {sessionData.totalPrice}</p>
            </div>
          </>
        ) : (
          <p className="text-xl">Loading line items...</p>
        )}
      </div>
      <div className="md:w-1/2 w-full flex flex-col justify-between items-center md:p-8">
        {/*Go back button*/}
        {sessionData && (
          <div className="self-start items-center flex flex-row p-4 md:p-0">
            <a href={sessionData.cancelUrl} className="flex flex-row items-center">

              <ChevronLeftIcon className="w-4 h-4 inline-block mr-2" />
              <p>Go back</p>

            </a>
          </div>
        )}

        {sessionData ? (
          <>
            {sessionData.payment_type === "recurring" && qrContent ? (
              <div className="p-6 rounded w-full max-w-md flex flex-col items-center justify-center space-y-4">
                <h3 className="text-2xl font-bold mb-4">Scan QR Code to Pay</h3>
                <QRCodeSVG value={qrContent} height={256} width={256} />
                <span>Get the Strapex App</span>
                <img src="/StrapexAppIcon.png" alt="Strapex App" className="h-12" />
                <div className="flex flex-row space-x-4">
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
                    <img src="/DownloadOnTheAppstore.png" alt="Download on the App Store" className="h-12" />
                  </a>
                  <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">
                    <img src="/GetItOnGooglePlay.png" alt="Get it on Google Play" className="h-12" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded w-full max-w-md">
                <Accordion.Root className="AccordionRoot" type="single" defaultValue="item-1" collapsible
                  value={activeSection}
                  onValueChange={setActiveSection}
                >

                {/* Contact Information Form */}
                {sessionData.shipping_address_collection == "required" && (
                  <Accordion.Item className="AccordionItem" value="item-1">
                    <Accordion.AccordionHeader className="AccordionHeader py-4">
                      <Accordion.AccordionTrigger className="AccordionTrigger w-full flex flex-row justify-between items-center">
                        <h3 className="text-2xl font-bold">Contact Information</h3>
                        <ChevronDownIcon className="AccordionChevron" aria-hidden />
                      </Accordion.AccordionTrigger>
                    </Accordion.AccordionHeader>
                    <Accordion.AccordionContent className="AccordionContent">
                      <ContactInformationForm
                        setContactInformation={setContactInformation}
                        contactInformation={contactInformation as ContactInformation}
                        handleNextClick={() => handleNextClick('item-1')}
                      />
                    </Accordion.AccordionContent>
                  </Accordion.Item>
                )}

                  {/* Shipping Address Form */}
                  {sessionData.shipping_address_collection == "required" && (
                    <Accordion.Item className="AccordionItem" value="item-2">
                      <Accordion.AccordionHeader className="AccordionHeader py-4">
                        <Accordion.AccordionTrigger className="AccordionTrigger w-full flex flex-row justify-between items-center">
                          <h3 className="text-2xl font-bold">Shipping Address</h3>
                          <ChevronDownIcon className="AccordionChevron" aria-hidden />
                        </Accordion.AccordionTrigger>

                      </Accordion.AccordionHeader>
                      <Accordion.AccordionContent className="AccordionContent">
                        <ShippingAddressForm
                          shippingAddress={shippingAddress as ShippingAddress}
                          setShippingAddress={setShippingAddress}
                          handleNextClick={() => handleNextClick('item-2')}
                        />
                      </Accordion.AccordionContent>
                    </Accordion.Item>
                  )}


                  {/* qrZone */}
                  {sessionData.payment_type === "recurring" && (qrContent) && (
                    <QRCodeSVG value={qrContent} height={256} width={256} />
                  )}

                  {/* Payment */}
                  <Accordion.Item className="AccordionItem" value="item-3">
                    <Accordion.AccordionHeader className="AccordionHeader py-4">
                      <Accordion.AccordionTrigger className="AccordionTrigger w-full flex flex-row justify-between items-center">
                        <h3 className="text-2xl font-bold">Payment</h3>
                        <ChevronDownIcon className="AccordionChevron" aria-hidden />
                      </Accordion.AccordionTrigger>
                    </Accordion.AccordionHeader>
                    <Accordion.AccordionContent className="AccordionContent space-y-4">


                      <div className="flex flex-row justify-between items-center border border-gray-200 p-4 rounded">
                        <div>
                          {sessionData.totalPrice && priceInToken && (
                            <div className="flex flex-col text-sm">
                              <p>Total Price</p>
                              <p className="text-xl font-semibold">
                                {formatSignificantDigits(formatUnits(priceInToken.priceInBaseToken, priceInToken.baseTokenDecimals))} {priceInToken.baseTokenTicker}
                              </p>
                              <span className="text-sm text-gray-500"> ≈ {formatSignificantDigits(formatUnits(priceInToken.priceInUSDC, 6))} USD</span>
                            </div>
                          )}
                        </div>

                        {account ? (
                          <SelectPaymentTokenModal
                            sessionData={sessionData}
                            isTokenSelectionOpen={isTokenSelectionOpen}
                            setIsTokenSelectionOpen={setIsTokenSelectionOpen}
                            tokensToPayWith={tokensToPayWith}
                            setTokensToPayWith={setTokensToPayWith}
                            tokensList={tokensList}
                            fetchAndSetPrependedSwapCalls={fetchAndSetPrependedSwapCalls}
                            addressBalances={addressBalances}
                            quotes={quotes}
                            priceInToken={priceInToken}
                            quotesLoading={quotesLoading}
                          />
                        ) : (
                          <Button onClick={connectToStarknet} className="bg-neutral-800" size="3">
                            <img src="/walletIcon.svg" alt="wallet" className="w-6 h-6 inline-block mr-2 " />
                            Connect Wallet</Button>
                        )}

                      </div>
                      <Button
                        onClick={payWithStarknet}
                        style={{width: "100%"}}
                        className="min-w-full w-full text-white px-6 py-3 rounded font-semibold"
                        size="3"
                        color="blue"
                        disabled={account === null || priceInToken === null || tokensToPayWith?.length === 0 || tokensToPayWith === null}
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


        <footer className="flex flex-col justify-center items-center">

          <div className="flex flex-row justify-center items-center">
            <p className="text-sm">Powered by </p>
            <a href="https://strapex.org">
            <img src="/strapex-black.png" alt="checkout" className="w-[41px] h-[16px] ml-2" />
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
          <div className="bg-white p-8 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-lg">Thank you for your payment. You will be redirected in 5 seconds.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => window.location.href = sessionData.successUrl}
            >
              Redirect Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

