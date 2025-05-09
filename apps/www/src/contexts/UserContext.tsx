"use client";
import {
  useDisconnect,
  useAccount,
  useConnect,
  Connector,
} from "@starknet-react/core";
import dotenv from "dotenv";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import * as Realm from "realm-web";
import {
  StarknetWindowObject,
  useStarknetkitConnectModal,
  StarknetkitConnector,
} from "starknetkit";

import { app } from "../../realmconfig";

dotenv.config();

export enum UserMode {
  OWNER = "owner",
  MULTIOWNER = "multiowner",
}

interface UserContextType {
  isLoggedIn: boolean;
  userMode: UserMode;
  login: () => void;
  logout: () => void;
  toggleMode: () => void;
  connection: StarknetWindowObject | null;
  contractAddress: string | null;
  userId: string | null; // Added userId to the context
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as unknown as StarknetkitConnector[],
    modalMode: "alwaysAsk",
    modalTheme: "dark",
    dappName: "Strapex",
    resultType: "wallet",
  });
  const connectWallet = async () => {
    const { connector } = await starknetkitConnectModal();
    if (!connector) {
      return;
    }
    await connect({ connector: connector as unknown as Connector });
  };
  const useAccountResult = useAccount();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMode, setUserMode] = useState<UserMode>(UserMode.OWNER);
  const [connection, setConnection] = useState<StarknetWindowObject | null>(
    null
  );
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Added state for userId

  useEffect(() => {
    const onLogin = async (address: string) => {
      const response = await fetch("/api/generateJWToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Braavos wallet returns a value of undefined for selectedAddress property of a wallet, so it is a problem
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate JWT token");
      }
      const { token } = await response.json();
      console.log({ token });
      // await app.logIn(Realm.Credentials.jwt(token));
      // const userId = app.currentUser?.id;
      const userId = "user-id";
      // setAccount(walletAccount);
      // setAddress(address);
      setUserId(userId ?? null);
      setIsLoggedIn(true);
    };
    if (useAccountResult.isConnected && useAccountResult.address) {
      //setAccount(useAccountResult.account);
      onLogin(useAccountResult.address);
    }
  }, [useAccountResult.isConnected, useAccountResult.address]);

  useEffect(() => {
    // This effect runs only on the client side
    if (typeof window !== "undefined") {
      const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
      if (storedIsLoggedIn !== null) {
        setIsLoggedIn(JSON.parse(storedIsLoggedIn));
      }

      const storedUserMode = localStorage.getItem("userMode");
      if (storedUserMode !== null) {
        setUserMode(storedUserMode as UserMode);
      }

      const storedUserId = localStorage.getItem("userId"); // Retrieve userId from localStorage
      if (storedUserId !== null) {
        setUserId(storedUserId);
      }

      const storedConnection = localStorage.getItem("connection");
      if (storedConnection !== null) {
        setConnection(JSON.parse(storedConnection));
      }
    }
  }, [useAccountResult.isConnected]);

  // Effect to persist isLoggedIn state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isLoggedIn", JSON.stringify(isLoggedIn));
    }
  }, [isLoggedIn]);

  // Effect to persist userMode state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("userMode", userMode);
    }
  }, [userMode]);

  // Effect to persist userId state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("userId", userId ?? "");
    }
  }, [userId]);

  // Effect to persist connection state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("connection", JSON.stringify(connection));
    }
  }, [connection]);

  // Effect to log out user when provider changes
  /* useEffect(() => {
    if (providerContext) {
      const { switchNetwork } = providerContext;
      const originalSwitchNetwork = switchNetwork;

      providerContext.switchNetwork = async (newNetwork: string) => {
        await logout();
        originalSwitchNetwork(newNetwork);
      };
    }
  }, [providerContext]); */

  const login = async () => {
    await connectWallet();
  };

  const switchChain = async () => {
    if (connection || connection === null) return;
  };

  const logout = async () => {
    disconnect();
    setIsLoggedIn(false);
    setConnection(null);
    // setAccount(null);
    // setAddress(null);
    setUserId(null);
  };

  const toggleMode = () =>
    setUserMode(
      userMode === UserMode.OWNER ? UserMode.MULTIOWNER : UserMode.OWNER
    );

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        userMode,
        login,
        logout,
        toggleMode,
        connection,
        contractAddress,
        userId, // Provide userId in the context value
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
