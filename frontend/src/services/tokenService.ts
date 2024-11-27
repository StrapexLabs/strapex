import axios from 'axios';
import { BigNumberish, Contract, InvokeFunctionResponse, RpcProvider, constants, selector } from 'starknet';
import { useUser } from "@/contexts/UserContext";
import tokensList from "../lib/tokens.json"; // Corrected import path for tokens.json
import { Balance } from '@/types';
import { ProviderContextType, useProvider } from '@/contexts/ProviderContext';

export interface Token {
    image: string;
    ticker: string;
    address: string;
    balanceSelector: string;
    balance: number;
}

export const fetchTokenBalances = async (walletAddress: string, provider: RpcProvider | null): Promise<Balance[]> => {
    if (!provider) {
        console.error('Provider context is null');
        return [];
    }

    try {
        const tokens: Token[] = tokensList; // Use the imported tokensList directly
        const balances: Balance[] = await Promise.all(
            tokens.map(async (token) => {
                const balance = await getAccountBalance(token.address, token.balanceSelector, walletAddress, provider);
                return {
                    ...token,
                    balance: balance || 0,
                };
            })
        );
        return balances;
    } catch (error) {
        console.error('Error fetching token balances:', error);
        return [];
    }
};

const getAccountBalance = async (tokenAddress: string, selector: string, walletAddress: string, provider: RpcProvider): Promise<number | null> => {

    
    try {
        const { abi: testAbi } = await provider.getClassAt(tokenAddress);
        if (testAbi === undefined) {
            throw new Error('no abi.');
        }
        const myTestContract = new Contract(testAbi, tokenAddress, provider);
        console.log(walletAddress);
        const result = await myTestContract.balanceOf(walletAddress);
        const balanceInGwei = parseInt(result);
        const balanceInEther = balanceInGwei / 10 ** 18; // Convert from gwei to ether
        console.log(`Found in this wallet (${walletAddress}) this ${balanceInEther} amount`, balanceInEther);
        return balanceInEther;
    } catch (error) {
        console.error(`Error fetching balance for ${walletAddress}:`, error);
        return null;
    }
};