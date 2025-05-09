"use client";
import { devnet, sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
  voyager,
} from "@starknet-react/core";
import { type ReactNode } from "react";
import { shortString } from "starknet";

const katana = {
  ...devnet,
  id: BigInt(shortString.encodeShortString("KATANA")),
  network: "katana",
  rpcUrls: {
    ...devnet.rpcUrls,
    public: {
      http: ["http://localhost:5050"],
    },
  },
  explorers: {
    explorer: ["http://localhost:5050/explorer"],
  },
} as const;

const StarknetProvider = ({ children }: { children: ReactNode }) => {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
  });

  return (
    <StarknetConfig
      chains={[katana, sepolia, mainnet]}
      provider={publicProvider()}
      connectors={connectors}
      explorer={voyager}
    >
      {children}
    </StarknetConfig>
  );
};

export default StarknetProvider;
