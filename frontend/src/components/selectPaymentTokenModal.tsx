"use client"

import { AVNU_OPTIONS, Balance, SessionData, Token, TokenToPayWith, TotalPrice } from '@/types'
import { formatSignificantDigits } from '@/utils/helpers'
import { Quote } from '@avnu/avnu-sdk'
import { ChevronRightIcon } from '@radix-ui/react-icons'
import { Avatar, Box, Button, CheckboxCards, Dialog, Flex, Grid, Skeleton, Slider, Text, Card } from '@radix-ui/themes'
import { formatUnits } from 'ethers'
import { Dispatch, SetStateAction, useState, useEffect, useMemo } from 'react'

type Props = {
  sessionData: SessionData | null
  isTokenSelectionOpen: boolean
  setIsTokenSelectionOpen: Dispatch<SetStateAction<boolean>>
  tokensToPayWith: TokenToPayWith[]
  setTokensToPayWith: Dispatch<SetStateAction<TokenToPayWith[]>>
  tokensList: Token[]
  fetchAndSetPrependedSwapCalls: (
    tokensToPayWith: TokenToPayWith[],
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
  const [tokenLimitError, setTokenLimitError] = useState(false);
  
  const totalPriceUSD = useMemo(() => {
    if (!priceInToken) return 0;
    return Number(formatUnits(priceInToken.priceInUSDC, 6));
  }, [priceInToken]);
 
  const sliderStep = useMemo(() => {
    if (!totalPriceUSD || selectedTokens.length <= 1) return 0.01;
    return totalPriceUSD / 100; 
  }, [totalPriceUSD, selectedTokens.length]);

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
    if(value.length > 2) {
      setTokenLimitError(true);

      setTimeout(() => {
        setTokenLimitError(false);
      }, 3000);
      return;
    }
    setSelectedTokens(value);
  };

  const handleConfirm = () => {
    const newTokensToPayWith = selectedTokens.map(address => {
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
    fetchAndSetPrependedSwapCalls(newTokensToPayWith);
    setIsTokenSelectionOpen(false);
  };

  const handleSliderChange = (value: number) => {
    if (selectedTokens.length !== 2) return; 
  
    const [tokenA, tokenB] = selectedTokens;
    const tokenAAmount = value;
    const tokenBAmount = totalPriceUSD - tokenAAmount;
  
    setSliderValues([tokenAAmount]); 
  
    setTokenAmounts({
      [tokenA]: tokenAAmount,
      [tokenB]: tokenBAmount,
    });
  };
  

  const isConfirmDisabled = selectedTokens.length === 0 ;


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
    let formattedAmount, sellAmountInUsd, tokenPrice, amountInUsd, ticker;

    if (token.address === priceInToken?.baseTokenAddress) {
      const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
      formattedAmount = formatSignificantDigits(baseTokenAmount);
      sellAmountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
      tokenPrice = Number(sellAmountInUsd) / Number(formattedAmount);
      amountInUsd = balance && tokenPrice ? balance?.balance * tokenPrice : 0;
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
      tokenPrice = quoteForToken?.sellAmountInUsd ? quoteForToken.sellAmountInUsd / Number(formatUnits(quoteForToken.sellAmount, token?.decimals || 18)) : 0;
      amountInUsd = balance?.balance && tokenPrice ? balance.balance * tokenPrice : 0;
      ticker = token.ticker;
      isThereEnough = (balance?.balance || 0) * 10 ** token.decimals >= sellAmount;
    }

    const cardContent = (
      <Flex className='cursor-pointer' direction="column" width="100%">
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
        className={`checkout-checkbox w-[209px] max-w-[209px] disabled:cursor-not-allowed cursor-pointer border-2 transition-colors ${
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
          <button className="flex flex-row items-center border border-gray-200 p-2 rounded flex-wrap max-w-[250px] justify-start gap-y-[6px]">
            {tokensToPayWith.map((tokenToPayWith, index) => {
              if(tokenToPayWith.amount === 0) return;
              const tokenAddress = tokenToPayWith?.tokenAddress;
              const token = tokensList.find((t) => t.address === tokenAddress);
              const tokenAmount = tokenToPayWith?.amount || 0;
              let amountInUsd, tokenPrice;
              if (token?.address === priceInToken?.baseTokenAddress) { 
                const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
                const formattedAmount = formatSignificantDigits(baseTokenAmount);
                const sellAmountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
                tokenPrice = Number(sellAmountInUsd) / Number(formattedAmount);
                amountInUsd = tokenAmount && tokenPrice?  tokenAmount / tokenPrice : 0;
              } else {
                const quote = quotes.find(
                  q => q.sellTokenAddress.slice(-63).toUpperCase() === tokenAddress.slice(-63).toUpperCase()
                );
                tokenPrice = quote?.sellAmountInUsd ? quote.sellAmountInUsd / Number(formatUnits(quote.sellAmount, token?.decimals || 18)) : 0;
                amountInUsd = tokenAmount && tokenPrice?  tokenAmount / tokenPrice : 0;
              }


              return (
                <Flex key={index} align="center" gap="1">
                  <Avatar size="1" src={token?.image} fallback={token?.ticker?.[0] || 'T'} />
                  <Box>
                    <Flex justify="center" direction="column">
                      <Text size="2">{Number(amountInUsd).toFixed(3)} {token?.ticker}</Text>
                      <Text size="1" color="gray">({tokenAmount?.toFixed(2)} USD)</Text>
                    </Flex>
                  </Box>
                  {index < tokensToPayWith.length - 1 && <Text className='mr-1'>+</Text>}
                </Flex>
              )
            })}
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: '90vw', width: '500px' }}>
        <Dialog.Title className='mb-6'>Select Payment Token</Dialog.Title>

        {quotesLoading ? (
          <Grid columns="2" gapX="10px" gapY="4px" width="100%">
            <Box className='border rounded-[6px] p-2'>
              <Flex direction="row" gapX="8px" align="center">
                <Skeleton><Avatar fallback="T" radius='full' size="3" /></Skeleton>
                <Flex direction="column" justify="center" width="100%">
                  <Button variant="soft" color="gray"><Skeleton>Loading...</Skeleton></Button>
                  <Text><Skeleton>Loading...</Skeleton></Text>
                </Flex>
              </Flex>
            </Box>
            <Box className='border rounded-[6px] p-2'>
              <Flex direction="row" gapX="8px" align="center">
                <Skeleton><Avatar fallback="T" radius='full' size="3" /></Skeleton>
                <Flex direction="column" justify="center" width="100%">
                  <Button variant="soft" color="gray"><Skeleton>Loading...</Skeleton></Button>
                  <Text><Skeleton>Loading...</Skeleton></Text>
                </Flex>
              </Flex>
            </Box>
          </Grid>
        ) : hasAnyTokenWithEnoughBalance ? (
          <CheckboxCards.Root 
            value={selectedTokens} 
            onValueChange={handleTokenSelection}
            className='checkout-checkbox-root'
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
              let formattedAmount, tokenPrice, sellAmountInUsd, amountInUsd, ticker;

              if (token.address === priceInToken?.baseTokenAddress) {
                const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
                formattedAmount = formatSignificantDigits(baseTokenAmount);
                sellAmountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
                tokenPrice = Number(sellAmountInUsd) / Number(formattedAmount);
                amountInUsd = balance? balance?.balance * tokenPrice : 0;
                ticker = priceInToken?.baseTokenTicker;
              } else {
                const quoteForToken = quotes.find(
                  (quote) => quote.sellTokenAddress.slice(-63).toUpperCase() === normalizedTokenAddress
                );
                if (!quoteForToken) return null;
                tokenPrice = quoteForToken?.sellAmountInUsd ? quoteForToken.sellAmountInUsd / Number(formatUnits(quoteForToken.sellAmount, token?.decimals || 18)) : 0;
                amountInUsd = balance?.balance && tokenPrice ? balance.balance * tokenPrice : 0;
                ticker = token.ticker;
              }

              return (
                <Card key={index} className=" w-full lg:w-[209px] cursor-not-allowed max-w-[209px] border-2 border-transparent">
                  <Flex direction="column" align="center" width="100%">
                    <Flex direction="row" align="center" gap="2" width="100%">
                      <Avatar size="3" src={token.image} fallback={ticker?.[0] || 'T'} />
                      <Flex direction="column" align="center" justify="center">
                        <Text size="5">
                          {balance ? balance.balance.toFixed(3) : '0'} {ticker}
                        </Text>
                        <Text size="2" color="gray">
                          ({Number(amountInUsd)?.toFixed(2) || 0} USD)
                        </Text>
                      </Flex>
                    </Flex>
                    <Text size="1" className="text-[12px]" color="red" mt="2">
                      Not Enough Balance
                    </Text>
                  </Flex>
                </Card>
              );
            })}
          </Grid>
        )}

        {selectedTokens.length > 1 && hasAnyTokenWithEnoughBalance && (
          <Box width="100%" className='bg-zinc-100 rounded p-4' mt="8">
            <Flex justify="between" wrap="wrap" gap="2">
              {selectedTokens.map((tokenAddress, index) => {
                const token = tokensList.find((t) => t.address === tokenAddress);
                let amountInUsd, tokenPrice, tokenAmount;
                amountInUsd = tokenAmounts[tokenAddress] || 0;
                if (token?.address === priceInToken?.baseTokenAddress) { 
                  const baseTokenAmount = formatUnits(priceInToken?.priceInBaseToken || 0, priceInToken?.baseTokenDecimals || 18);
                  const formattedAmount = formatSignificantDigits(baseTokenAmount);
                  const sellAmountInUsd = formatUnits(priceInToken?.priceInUSDC || 0, 6);
                  tokenPrice = Number(sellAmountInUsd) / Number(formattedAmount);
                  tokenAmount = tokenPrice ? amountInUsd / tokenPrice : 0;
                } else {
                  const quote = quotes.find(
                    q => q.sellTokenAddress.slice(-63).toUpperCase() === tokenAddress.slice(-63).toUpperCase()
                  );
                  tokenPrice = quote?.sellAmountInUsd ? quote.sellAmountInUsd / Number(formatUnits(quote.sellAmount, token?.decimals || 18)) : 0;
                  tokenAmount = tokenPrice ? amountInUsd / tokenPrice : 0;
                }

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
                          <Text size="2">{tokenAmount?.toFixed(4)} {token?.ticker}</Text>
                          <Text className='text-[10px]' color="gray">
                            (${amountInUsd.toFixed(2)})
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                  </Box>
                )
              })}
            </Flex>
            <Slider
              value={[sliderValues[0] || 0]} 
              onValueChange={(value) => handleSliderChange(value[0])}
              max={totalPriceUSD}
              className="mt-4 checkout-slider" 
              step={sliderStep} 
              color='blue'
              highContrast
            />

          </Box>
        )}
        
          <Flex className='h-4'>
            {tokenLimitError &&  (<Text className='text-sm text-red-600'>You can only select two tokens.</Text>) }
          </Flex>

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

