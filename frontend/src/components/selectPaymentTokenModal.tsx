import { AVNU_OPTIONS, Balance, SessionData, Token, TokenToPayWith, TotalPrice } from '@/types';
import { formatSignificantDigits } from '@/utils/helpers';
import { Quote } from '@avnu/avnu-sdk';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { Button, Dialog, Flex, RadioCards, Skeleton, Slider, Text } from '@radix-ui/themes';
import { formatUnits } from 'ethers';
import { Dispatch, SetStateAction } from 'react';

type Props = {
    sessionData: SessionData | null;
    isTokenSelectionOpen: boolean;
    setIsTokenSelectionOpen: Dispatch<SetStateAction<boolean>>;
    tokenToPayWith: TokenToPayWith | null;
    tokensList: Token[];
    fetchAndSetPrependedSwapCalls: (
        tokenAddress: string,
        slippage?: number,
        executeApprove?: boolean,
        options?: typeof AVNU_OPTIONS,
      ) => void;
    addressBalances: Balance[];
    quotes: Quote[];
    priceInToken: TotalPrice | null;
    quotesLoading: boolean;
  };

const SelectPaymentTokenModal = ({
    sessionData,
    isTokenSelectionOpen,
    setIsTokenSelectionOpen,
    tokenToPayWith,
    tokensList,
    fetchAndSetPrependedSwapCalls,
    addressBalances,
    quotes,
    priceInToken,
    quotesLoading,
}: Props) => {
  return (
    <Dialog.Root open={isTokenSelectionOpen} onOpenChange={(isOpen) => setIsTokenSelectionOpen(isOpen)}>
    <Dialog.Trigger>
      {tokenToPayWith == null ? (
        <Button className="bg-neutral-800">Select Payment Token</Button>
      ) : (
        (() => {
          console.log("Selected token address", tokenToPayWith.tokenAddress);

          let token = tokensList.find((token) => token.address === tokenToPayWith.tokenAddress);
          let tokenImage = token?.image;

          const quoteForToken = quotes.find(
            (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === token?.address.slice(-63).toUpperCase()
          );
          console.log("Quote for token", quoteForToken)
          const amountInUsd = quoteForToken ? quoteForToken.sellAmountInUsd : 0;
          const amount = quoteForToken ? quoteForToken.sellAmount : BigInt(0);
          const formattedAmount = formatUnits(amount, token?.decimals);
          const formattedAmountSignificant = formatSignificantDigits(formattedAmount);

          return (
            <button className="flex flex-row items-center border border-gray-200 p-2 rounded">
              <img src={tokenImage} alt={tokenToPayWith.tokenAddress} className="w-5 h-5 inline-block mb-2" />
              <div className="flex flex-col ml-1">
                <span className="text-sm">{formattedAmountSignificant}{token?.ticker}</span>
                <span className="text-xs text-gray-500">({amountInUsd.toFixed(2)} USD)</span>
              </div>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          );
        })()
      )}
    </Dialog.Trigger>
    <Dialog.Content maxWidth="530px">
      <Dialog.Title>Select Payment Token</Dialog.Title>
      {/* <Dialog.Description size="2" mb="4">
        Choose the token you want to use for payment.
      </Dialog.Description> */}

      <RadioCards.Root defaultValue={tokenToPayWith?.tokenAddress ?? undefined} onValueChange={(value) => fetchAndSetPrependedSwapCalls(value)} columns={{ initial: '2' }}>
        {quotesLoading ? (
              <RadioCards.Root columns={{ initial: '2' }}>
                <RadioCards.Item value="dummy1">
                  <Flex direction="column" width="100%">
                    <Text><Skeleton>Loading...</Skeleton></Text>
                    <Button variant="soft" color="gray"><Skeleton>Loading...</Skeleton></Button>
                  </Flex>
                </RadioCards.Item>
                <RadioCards.Item value="dummy2">
                  <Flex direction="column" width="100%">
                    <Text><Skeleton> Loading...</Skeleton></Text>
                    <Button variant="soft" color="gray"><Skeleton> Loading... </Skeleton></Button>
                  </Flex>
                </RadioCards.Item>
              </RadioCards.Root>
          ) : (
            <>
               {addressBalances.map((balance, index) => {
                  // Normalize addresses by slicing the last 63 characters
                  const normalizedBalanceAddress = balance.address.slice(-63).toUpperCase();
                  console.log("Normalized balance address", normalizedBalanceAddress);

                  // Find the token in the tokensList based on the normalized address
                  const token = tokensList.find(
                    (token) => token.address.slice(-63).toUpperCase() === normalizedBalanceAddress
                  );
                  console.log("The token is", token)
                  console.log("price in token", priceInToken)
                  if (token && token.address === priceInToken?.baseTokenAddress) {
                    // Handle ETH token separately
                    const baseTokenAmount = priceInToken ? formatUnits(priceInToken.priceInBaseToken, priceInToken.baseTokenDecimals) : "0";
                    const formattedBaseTokenAmount = formatSignificantDigits(baseTokenAmount);
                    const baseTokenAmountInUsd = priceInToken ? formatUnits(priceInToken.priceInUSDC, 6) : "0";
                    console.log("Total price by session data", sessionData?.totalPrice);
                    console.log("Here is the balance", balance)
                    console.log("priceintoken", priceInToken)
                    const isThereEnough = balance.balance * 10 ** token.decimals >= priceInToken?.priceInBaseToken;

                    return (
                      <RadioCards.Item key={index} value={token.address} disabled={!isThereEnough}>
                        <Flex direction="row" align="center" width="100%">
                            <img src={token.image} alt={token.ticker} className="w-6 h-6 inline-block mb-2" />
                            <Flex direction="column" align="center" width="100%">
                                <Text weight="bold">{formattedBaseTokenAmount} {priceInToken?.baseTokenTicker}</Text>
                                <Text>({Number(baseTokenAmountInUsd).toFixed(2)} USD)</Text>
                                {!isThereEnough && (
                                    <Text size="1" color="red">
                                    Not Enough Balance
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                      </RadioCards.Item>
                    );
                  } else if (token && balance.balance > 0) {
                    // Handle other tokens using quotes and check if balance is greater than 0
                    const quoteForToken = quotes.find(
                      (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedBalanceAddress
                    );
                    if (!quoteForToken) {
                      return null;
                    }
                    console.log("Quote for token", quoteForToken);
                    console.log("Wallet token balance", balance.balance);
                    console.log("Needed balance", quoteForToken?.sellAmount);
                    const isThereEnough = balance.balance * 10 ** token.decimals >= quoteForToken?.sellAmount;
                    const amountInUsd = quoteForToken ? quoteForToken.sellAmountInUsd : 0;
                    const amount = quoteForToken ? quoteForToken.sellAmount : BigInt(0);
                    const formattedAmount = formatUnits(amount, token.decimals);
                    const formattedAmountSignificant = formatSignificantDigits(formattedAmount);

                    return (
                      <RadioCards.Item key={index} value={token.address} disabled={!isThereEnough} >
                        <Flex direction="row" align="center" width="100%">
                          <img src={token.image} alt={token.ticker} className="w-6 h-6 inline-block mb-2" />
                          <Flex direction="column" align="center" width="100%">
                            <Text weight="bold">{formattedAmountSignificant} {token.ticker}</Text>
                            <Text>({amountInUsd.toFixed(2)} USD)</Text>
                            {!isThereEnough && (
                              <Text size="1" color="red">
                                Not Enough Balance
                              </Text>
                            )}
                          </Flex>
                        </Flex>
                      </RadioCards.Item>
                    );
                  }
                  // Token not found in the tokensList
                  return null;
                })}
                <Slider defaultValue={[10]} />
            </>
          )}
        
      </RadioCards.Root>
      <Flex gap="3" mt="4" justify="end">
        {/* <Dialog.Close>
          <Button variant="soft" color="gray">
            Cancel
          </Button>
        </Dialog.Close> */}
        <Dialog.Close>
          <Button className="bg-black" onClick={() => fetchAndSetPrependedSwapCalls(tokenToPayWith?.tokenAddress ?? "")}>Confirm</Button>
        </Dialog.Close>
      </Flex>
    </Dialog.Content>
  </Dialog.Root>
  )
}

export default SelectPaymentTokenModal