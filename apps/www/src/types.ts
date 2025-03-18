import { ObjectId } from "mongodb";

export type BizWallet = {
  name: string;
  description: string;
  tags: string;
  apiKey: string;
  contractAddress: string;
  ownerAddress: string;
  createdAt: Date;
};

export interface Balance {
  image: string;
  ticker: string;
  address: string;
  balanceSelector: string;
  balance: number;
}

export interface BizWalletWithBalance extends BizWallet {
  balances: Balance[];
}

export interface Product {
  _id?: ObjectId;
  payment_type: Payment_type;
  name: string;
  price: number;
  token: string;
  address: string;
  createdAt: Date;
  owner: string;
}

export type Payment_type = "onetime" | "recurring";

export interface SessionData {
  sessionId: string;
  totalPrice: number;
  totalPriceToken: string;
  payment_type: Payment_type;
  successUrl: string;
  cancelUrl: string;
  depositAddress: string;
  lineItems: Item[];
  status: string;
  billing_address_collection?: string;
  shipping_address_collection?: string;
}

export interface Item {
  id?: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
}

export interface Token {
  image: string;
  ticker: string;
  address: string;
  sepoliaAddress: string;
  balanceSelector: string;
  balance: number;
  decimals: number;
}
