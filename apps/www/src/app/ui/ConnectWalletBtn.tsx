"use client";
import { PersonIcon, CaretDownIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu, Switch } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
// import { Account } from "starknet";
// import { StarknetWindowObject, connect, disconnect } from "starknetkit";

import { useProvider } from "@/contexts/ProviderContext";
import { UserMode, useUser } from "@/contexts/UserContext";
import { getRoute } from "@/utils/getRoute";

export default function ConnectWalletBtn() {
  const userContext = useUser();
  const providerContext = useProvider();
  const pathname = usePathname();
  const isLoggedIn = userContext?.isLoggedIn;

  useEffect(() => {
    if (isLoggedIn) {
      console.log("Logged in");
    }
  }, [isLoggedIn]);

  return isLoggedIn ? (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="soft" className="text-main">
          Account
          <CaretDownIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item>
          <Link href={getRoute("/accounts", pathname)}>Accounts</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <Link href={getRoute("/createBiz", pathname)}>Create biz</Link>
        </DropdownMenu.Item>

        <DropdownMenu.Item onClick={userContext?.toggleMode}>
          Switch to{" "}
          {userContext?.userMode === UserMode.OWNER ? "freelancer" : "client"}
        </DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Item>
          <div className="flex items-center">
            <span className="mr-2">Testnet</span>
            <Switch
              checked={providerContext?.network === "mainnet"}
              onCheckedChange={(checked) =>
                providerContext?.switchNetwork(checked ? "mainnet" : "sepolia")
              }
            />
            <span className="ml-2">Mainnet</span>
          </div>
        </DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={userContext?.logout}>
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ) : (
    <Button
      onClick={userContext?.login}
      className="rounded bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-700"
    >
      <PersonIcon />
      Sign In
    </Button>
  );
}
