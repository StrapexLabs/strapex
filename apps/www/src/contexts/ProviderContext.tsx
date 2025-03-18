"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { RpcProvider } from "starknet";

export type ProviderContextType = {
  provider: RpcProvider;
  network: string;
  switchNetwork: (newNetwork: string) => void;
};

const ProviderContext = createContext<ProviderContextType>({
  provider: new RpcProvider({
    nodeUrl:
      "https://starknet-mainnet.blastapi.io/fec79bb2-ce39-4a58-8668-a96ce919142e/rpc/v0_6",
  }),
  network: "mainnet",
  switchNetwork: () => {},
});

interface ProviderProviderProps {
  children: React.ReactNode;
}

import { usePathname, useRouter } from "next/navigation";

export const ProviderProvider: React.FC<ProviderProviderProps> = ({
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const isTestnet = pathname.startsWith("/test");

  const [network, setNetwork] = useState(isTestnet ? "sepolia" : "mainnet");
  const [provider, setProvider] = useState(
    new RpcProvider({
      nodeUrl: isTestnet
        ? "https://starknet-sepolia.infura.io/v3/6a887768796341eea926d3097459149e"
        : "https://starknet-mainnet.blastapi.io/fec79bb2-ce39-4a58-8668-a96ce919142e/rpc/v0_6",
    }),
  );

  const switchNetwork = (newNetwork: string) => {
    setNetwork(newNetwork);
    setProvider(
      new RpcProvider({
        nodeUrl:
          newNetwork === "mainnet"
            ? "https://starknet-mainnet.blastapi.io/fec79bb2-ce39-4a58-8668-a96ce919142e/rpc/v0_6"
            : "https://starknet-sepolia.infura.io/v3/6a887768796341eea926d3097459149e",
      }),
    );

    if (newNetwork === "sepolia") {
      router.push("/test" + pathname);
    } else {
      router.push(pathname.replace("/test", ""));
    }
  };

  return (
    <ProviderContext.Provider value={{ provider, network, switchNetwork }}>
      {children}
    </ProviderContext.Provider>
  );
};

export const useProvider = () => useContext(ProviderContext);
