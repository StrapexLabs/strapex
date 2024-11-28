import { AVNU_OPTIONS, Balance, SessionData, Token, TokenToPayWith, TotalPrice } from '@/types';
import { formatSignificantDigits } from '@/utils/helpers';
import { Quote } from '@avnu/avnu-sdk';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { Box, Button, Dialog, Flex, RadioCards, Skeleton, Slider, Text } from '@radix-ui/themes';
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
        <Button className="bg-neutral-800 mb-5">Select Payment Token</Button>
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
    <Dialog.Content minWidth="500px" maxWidth="max-content">
      <Dialog.Title>Select Payment Token</Dialog.Title>

      <RadioCards.Root defaultValue={tokenToPayWith?.tokenAddress ?? undefined} onValueChange={(value) => fetchAndSetPrependedSwapCalls(value)} className='grid grid-cols-2' columns={{ initial: '2' }}>
        {quotesLoading ? (
              <>
                <RadioCards.Item className='' value="dummy1">
                  <Flex direction="column" width="209px">
                    <Text><Skeleton>Loading...</Skeleton></Text>
                    <Button variant="soft" color="gray"><Skeleton>Loading...</Skeleton></Button>
                  </Flex>
                </RadioCards.Item>
                <RadioCards.Item className='' value="dummy2">
                  <Flex direction="column" width="209px">
                    <Text><Skeleton> Loading...</Skeleton></Text>
                    <Button variant="soft" color="gray"><Skeleton> Loading... </Skeleton></Button>
                  </Flex>
                </RadioCards.Item>
              </>
          ) : (
            <>
              {addressBalances.map((balance, index) => {
                const normalizedBalanceAddress = balance.address.slice(-63).toUpperCase();
                const token = tokensList.find(
                  (token) => token.address.slice(-63).toUpperCase() === normalizedBalanceAddress
                );
                console.log("Balance of", token, "is", token);

                // if (!token || balance.balance <= 0) return null
                

                let isThereEnough = false;
                let formattedAmount, amountInUsd, ticker;

                if (token.address === priceInToken?.baseTokenAddress) {
                  // ETH or base token case
                  const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
                  formattedAmount = formatSignificantDigits(baseTokenAmount);
                  amountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
                  ticker = priceInToken?.baseTokenTicker;
                  isThereEnough = balance.balance * 10 ** token.decimals >= priceInToken?.priceInBaseToken;
                } else {
                  // Other tokens using quotes
                  const quoteForToken = quotes.find(
                    (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedBalanceAddress
                  );
                  if (!quoteForToken) return null;

                  const sellAmount = quoteForToken.sellAmount || BigInt(0);
                  console.log("sell", sellAmount)
                  formattedAmount = formatSignificantDigits(formatUnits(sellAmount, token.decimals));
                  console.log("formatted amount", formattedAmount)
                  amountInUsd = quoteForToken.sellAmountInUsd || 0;
                  console.log("amount in usd", amountInUsd)
                  ticker = token.ticker;
                  isThereEnough = balance.balance * 10 ** token.decimals >= sellAmount;
                  console.log("is there enough", isThereEnough)
                }

                return (
                  <RadioCards.Item className='min-w-[204px] p-0' key={index} value={token.address} disabled={!isThereEnough}>
                    <Flex direction="column" width="100%">
                      <Flex direction="row" align="center" gapX="2" width="100%">
                        <img src={token.image} alt={ticker} width={50} height={50} className="inline-block" />
                        <Flex direction="column" className='align-center gap-2 justify-center' align="center" width="100%">
                          <Text className="text-2xl">
                            {formattedAmount} {ticker}
                          </Text>
                          <Text className='text-base' color="gray">
                            ({Number(amountInUsd).toFixed(2)} USD)
                          </Text>
                        </Flex>
                      </Flex>
                      <Flex direction="row" align="end" justify="center" className='mt-2 mr-6' width="100%">
                          {!isThereEnough && (
                            <Text size="1" color="red">
                              Not Enough Balance
                            </Text>
                          )}
                      </Flex>
                    </Flex>
                  </RadioCards.Item>
                );
              })}
            </>
          )}
      </RadioCards.Root>
      <Box width="100%" className='bg-zinc-100 rounded p-3' mt="9">
        {/* <Flex>

        </Flex> */}
        <Flex gap="3" mt="4" justify="end">
          <Slider defaultValue={[0]} />
        </Flex>
      </Box>
      <Flex gap="3" mt="4" justify="end">
        <Dialog.Close>
          <Button className="bg-black" style={{backgroundColor: "black"}} onClick={() => fetchAndSetPrependedSwapCalls(tokenToPayWith?.tokenAddress ?? "")}>Confirm</Button>
        </Dialog.Close>
      </Flex>
    </Dialog.Content>
  </Dialog.Root>
  )
}

export default SelectPaymentTokenModal