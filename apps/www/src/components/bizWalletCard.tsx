// BizWalletCard.tsx
import { BizWalletWithBalance } from "@/types";

interface BizWalletCardProps {
  account: BizWalletWithBalance;
}

export default function BizWalletCard({ account }: BizWalletCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-2 text-xl font-semibold">{account.name}</h2>
      <p className="mb-4 text-gray-600">{account.description}</p>
      <div className="flex space-x-2">
        {account.tags.split(",").map((tag) => (
          <span
            key={tag}
            className="inline-block rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700"
          >
            {tag.trim()}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Contract Address: {account.contractAddress}
      </p>
      <div className="mt-4">
        <h3 className="mb-2 text-lg font-bold">Balances</h3>
        <ul>
          {account.balances.map((balance) => (
            <li key={balance.address} className="mb-2">
              <span className="font-semibold">{balance.ticker}:</span>{" "}
              {balance.balance.toFixed(6)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
