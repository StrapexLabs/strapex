"use client"

import { AVNU_OPTIONS, Balance, SessionData, Token, TokenToPayWith, TotalPrice } from '@/types'
import { formatSignificantDigits } from '@/utils/helpers'
import { Quote } from '@avnu/avnu-sdk'
import { ChevronRightIcon } from '@radix-ui/react-icons'
import { Avatar, Box, Button, CheckboxCards, Dialog, Flex, Grid, Skeleton, Slider, Text, Card } from '@radix-ui/themes'
import { formatUnits, parseUnits } from 'ethers'
import { Dispatch, SetStateAction, useState, useEffect, useMemo } from 'react'

type Props = {
  sessionData: SessionData | null
  isTokenSelectionOpen: boolean
  setIsTokenSelectionOpen: Dispatch<SetStateAction<boolean>>
  tokensToPayWith: TokenToPayWith[]
  setTokensToPayWith: Dispatch<SetStateAction<TokenToPayWith[]>>
  tokensList: Token[]
  fetchAndSetPrependedSwapCalls: (
    tokenAddresses: string[],
    slippage?: number,
    executeApprove?: boolean,
    options?: typeof AVNU_OPTIONS,
  ) => void
  addressBalances: Balance[]
  quotes: Quote[]
  priceInToken: TotalPrice | null
  quotesLoading: boolean
};

const SelectPaymentTokenModal = ({
  sessionData,
  isTokenSelectionOpen,
  setIsTokenSelectionOpen,
  tokensToPayWith,
  setTokensToPayWith,
  tokensList,
  fetchAndSetPrependedSwapCalls,
  addressBalances,
  quotes,
  priceInToken,
  quotesLoading,
}: Props) => {
  const [selectedTokens, setSelectedTokens] = useState<string[]>(tokensToPayWith?.map(t => t.tokenAddress));
  const [sliderValues, setSliderValues] = useState<number[]>([]);
  const [tokenAmounts, setTokenAmounts] = useState<{ [key: string]: number }>({});

  const totalPriceUSD = useMemo(() => {
    if (!priceInToken) return 0;
    return Number(formatUnits(priceInToken.priceInUSDC, 6));
  }, [priceInToken]);

  useEffect(() => {
    if (selectedTokens.length > 0) {
      const initialValue = totalPriceUSD / selectedTokens.length;
      setSliderValues(selectedTokens.map(() => initialValue));
      
      const initialAmounts: { [key: string]: number } = {};
      selectedTokens.forEach(tokenAddress => {
        initialAmounts[tokenAddress] = initialValue;
      });
      setTokenAmounts(initialAmounts);
    } else {
      setSliderValues([]);
      setTokenAmounts({});
    }
  }, [selectedTokens, totalPriceUSD]);

  const handleTokenSelection = (value: string[]) => {
    setSelectedTokens(value);
  };

  const handleConfirm = () => {
    const newTokensToPayWith = selectedTokens.map(address => {
      const token = tokensList.find(t => t.address === address);
      const quote = quotes.find(
        q => q.sellTokenAddress.slice(-63).toUpperCase() === address.slice(-63).toUpperCase()
      );
      
      return {
        tokenAddress: address,
        quoteId: quote?.quoteId || "",
        amount: tokenAmounts[address] || 0,
      };
    });
    
    setTokensToPayWith(newTokensToPayWith);
    fetchAndSetPrependedSwapCalls(selectedTokens);
    setIsTokenSelectionOpen(false);
  };

  const handleSliderChange = (newValues: number[]) => {
    setSliderValues(newValues);
    
    const newTokenAmounts: { [key: string]: number } = {};
    selectedTokens.forEach((tokenAddress, index) => {
      newTokenAmounts[tokenAddress] = newValues[index];
    });
    setTokenAmounts(newTokenAmounts);
  };

  const isConfirmDisabled = selectedTokens.length === 0 || 
    Math.abs(sliderValues.reduce((a, b) => a + b, 0) - totalPriceUSD) > 0.01;

  useEffect(() => {
    updateTokenAmounts(sliderValues);
  }, [priceInToken]);

  const updateTokenAmounts = (values: number[]) => {
    if (!priceInToken) return;

    const newTokenAmounts: { [key: string]: number } = {};

    selectedTokens.forEach((tokenAddress, index) => {
      const tokenAmount = values[index];
      newTokenAmounts[tokenAddress] = tokenAmount;
    });

    setTokenAmounts(newTokenAmounts);
  };

  const renderTokenCard = (token: Token, balance: Balance | undefined, index: number) => {
    const normalizedTokenAddress = token.address.slice(-63).toUpperCase();
    let isThereEnough = false;
    let formattedAmount, amountInUsd, ticker;

    if (token.address === priceInToken?.baseTokenAddress) {
      const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
      formattedAmount = formatSignificantDigits(baseTokenAmount);
      amountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
      ticker = priceInToken?.baseTokenTicker;
      isThereEnough = (balance?.balance || 0) * 10 ** token.decimals >= priceInToken?.priceInBaseToken;
    } else {
      const quoteForToken = quotes.find(
        (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress
      );
      if (!quoteForToken) return null;

      const sellAmount = quoteForToken.sellAmount || BigInt(0);
      formattedAmount = formatSignificantDigits(formatUnits(sellAmount, token.decimals));
      amountInUsd = quoteForToken.sellAmountInUsd || 0;
      ticker = token.ticker;
      isThereEnough = (balance?.balance || 0) * 10 ** token.decimals >= sellAmount;
    }

    const cardContent = (
      <Flex direction="column" width="100%">
        <Flex direction="row" align="center" gap="2" width="100%">
          <Avatar size="3" src={token.image} fallback={ticker?.[0] || 'T'} />
          <Flex direction="column" align="center" justify="center">
            <Text size="5">
              {balance ? balance.balance.toFixed(3) : '0'} {ticker}
            </Text>
            <Text size="2" color="gray">
              ({Number(amountInUsd).toFixed(2)} USD)
            </Text>
          </Flex>
        </Flex>
      </Flex>
    );

    return (
      <CheckboxCards.Item 
        key={index} 
        value={token.address} 
        className={`w-[209px] max-w-[209px] disabled:cursor-not-allowed border-2 transition-colors ${
          selectedTokens.includes(token.address) ? 'border-blue-500' : 'border-transparent'
        }`} 
        disabled={!isThereEnough}
      >
        {cardContent}
      </CheckboxCards.Item>
    );
  };

  const hasAnyTokenWithEnoughBalance = useMemo(() => {
    return tokensList.some(token => {
      const balance = addressBalances.find(
        (balance) => balance.address.slice(-63).toUpperCase() === token.address.slice(-63).toUpperCase()
      );
      const normalizedTokenAddress = token.address.slice(-63).toUpperCase();
      let isThereEnough = false;

      if (token.address === priceInToken?.baseTokenAddress) {
        isThereEnough = (balance?.balance || 0) * 10 ** token.decimals >= priceInToken?.priceInBaseToken;
      } else {
        const quoteForToken = quotes.find(
          (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress
        );
        if (quoteForToken) {
          const sellAmount = quoteForToken.sellAmount || BigInt(0);
          isThereEnough = (balance?.balance || 0) * 10 ** token.decimals >= sellAmount;
        }
      }

      return isThereEnough;
    });
  }, [tokensList, addressBalances, priceInToken, quotes]);

  return (
    <Dialog.Root open={isTokenSelectionOpen} onOpenChange={(isOpen) => setIsTokenSelectionOpen(isOpen)}>
      <Dialog.Trigger>
        {tokensToPayWith.length === 0 ? (
          <Button className="bg-neutral-800 mb-5">Select Payment Token</Button>
        ) : (
          <button className="flex flex-row items-center border border-gray-200 p-2 rounded">
            {tokensToPayWith.map((tokenToPayWith, index) => {
              const token = tokensList.find((t) => t.address === tokenToPayWith.tokenAddress);
              const quote = quotes.find(
                (q) => q.sellTokenAddress.slice(-63).toUpperCase() === token?.address.slice(-63).toUpperCase()
              )
              const amount = quote ? formatUnits(quote.sellAmount, token?.decimals) : '0';
              const formattedAmount = formatSignificantDigits(amount);
              const amountInUsd = quote ? quote.sellAmountInUsd : 0;

              return (
                <Flex key={index} align="center" gap="2">
                  <Avatar size="1" src={token?.image} fallback={token?.ticker?.[0] || 'T'} />
                  <Box>
                    <Flex justify="center" direction="column">
                      <Text size="2">{formattedAmount} {token?.ticker}</Text>
                      <Text size="1" color="gray">({amountInUsd.toFixed(2)} USD)</Text>
                    </Flex>
                  </Box>
                  {index < tokensToPayWith.length - 1 && <Text className='mr-1'>+</Text>}
                </Flex>
              )
            })}
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: '90vw', width: '500px' }}>
        <Dialog.Title className='mb-6'>Select Payment Token</Dialog.Title>

        {quotesLoading ? (
          <Grid columns="2" gapX="10px" gapY="4px" width="100%">
            <Box className='border rounded-[6px] p-2'>
              <Flex direction="column" width="100%">
                <Text><Skeleton>Loading...</Skeleton></Text>
                <Button variant="soft" color="gray"><Skeleton>Loading...</Skeleton></Button>
              </Flex>
            </Box>
            <Box className='border rounded-[6px] p-2'>
              <Flex direction="column" width="200px">
                <Text><Skeleton> Loading...</Skeleton></Text>
                <Button variant="soft" color="gray"><Skeleton> Loading... </Skeleton></Button>
              </Flex>
            </Box>
          </Grid>
        ) : hasAnyTokenWithEnoughBalance ? (
          <CheckboxCards.Root 
            value={selectedTokens} 
            onValueChange={handleTokenSelection}
          >
            <Grid columns="2" gapX="10px" gapY="5px" width="100%">
              {tokensList.map((token, index) => {
                const balance = addressBalances.find(
                  (balance) => balance.address.slice(-63).toUpperCase() === token.address.slice(-63).toUpperCase()
                );
                return renderTokenCard(token, balance, index);
              })}
            </Grid>
          </CheckboxCards.Root>
        ) : (
          <Grid columns="2" gapX="10px" gapY="4px" width="100%">
            {tokensList.map((token, index) => {
              const balance = addressBalances.find(
                (balance) => balance.address.slice(-63).toUpperCase() === token.address.slice(-63).toUpperCase()
              );
              const normalizedTokenAddress = token.address.slice(-63).toUpperCase();
              let formattedAmount, amountInUsd, ticker;

              if (token.address === priceInToken?.baseTokenAddress) {
                const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
                formattedAmount = formatSignificantDigits(baseTokenAmount);
                // amountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
                ticker = priceInToken?.baseTokenTicker;
              } else {
                const quoteForToken = quotes.find(
                  (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress
                );
                if (!quoteForToken) return null;

                const sellAmount = quoteForToken.sellAmount || BigInt(0);
                formattedAmount = formatSignificantDigits(formatUnits(sellAmount, token.decimals));
                amountInUsd = quoteForToken.sellAmountInUsd || 0;
                ticker = token.ticker;
              }

              return (
                <Card key={index} className="w-[209px] max-w-[209px] border-2 border-transparent">
                  <Flex direction="column" align="center" width="100%">
                    <Flex direction="row" align="center" gap="2" width="100%">
                      <Avatar size="3" src={token.image} fallback={ticker?.[0] || 'T'} />
                      <Flex direction="column" align="center" justify="center">
                        <Text size="5">
                          {balance ? balance.balance : '0'} {ticker}
                        </Text>
                        <Text size="2" color="gray">
                          0 USD
                        </Text>
                      </Flex>
                    </Flex>
                    {/* <Text size="1" color="red" mt="2">
                      Not Enough Balance
                    </Text> */}
                  </Flex>
                </Card>
              );
            })}
          </Grid>
        )}

        {selectedTokens.length > 0 && hasAnyTokenWithEnoughBalance && (
          <Box width="100%" className='bg-zinc-100 rounded p-4' mt="8">
            <Flex justify="between" wrap="wrap" gap="2">
              {selectedTokens.map((tokenAddress, index) => {
                const token = tokensList.find((t) => t.address === tokenAddress)
                const quote = quotes.find(
                  q => q.sellTokenAddress.slice(-63).toUpperCase() === tokenAddress.slice(-63).toUpperCase()
                );
                const usdAmount = tokenAmounts[tokenAddress] || 0;
                const tokenPrice = quote?.sellAmountInUsd ? quote.sellAmountInUsd / Number(formatUnits(quote.sellAmount, token?.decimals || 18)) : 0;
                const tokenAmount = tokenPrice ? usdAmount / tokenPrice : 0;

                return (
                  <Box key={index} className="h-[45px] px-2 py-1 bg-white rounded-[4px]">
                    <Flex gap="2" align="center">
                      <Avatar
                        size="1"
                        src={token?.image}
                        fallback={token?.ticker?.[0] || 'T'}
                      />
                      <Box className='flex flex-col justify-center text-center gap-0'>
                        <Flex direction="column" justify="center" gap="0">
                          <Text size="2">{tokenAmount.toFixed(4)} {token?.ticker}</Text>
                          <Text className='text-[10px]' color="gray">
                            (${usdAmount.toFixed(2)})
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                  </Box>
                )
              })}
            </Flex>
            <Slider 
              value={sliderValues} 
              onValueChange={handleSliderChange} 
              className="mt-4" 
              step={0.01}
              min={0}
              max={totalPriceUSD}
            />
          </Box>
        )}

        <Flex gap="3" mt="4" justify="end">
          <Button 
            style={{
              backgroundColor: isConfirmDisabled ? "#808080" : "black",
              color: "white",
              cursor: isConfirmDisabled ? "not-allowed" : "pointer",
            }} 
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            Confirm
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default SelectPaymentTokenModal

