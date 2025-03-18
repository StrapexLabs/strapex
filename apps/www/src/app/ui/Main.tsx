import { RocketIcon } from "@radix-ui/react-icons";
import { Button, Text } from "@radix-ui/themes";
import createGlobe from "cobe";
import { Strapex } from "strapex-react";

import Globe from "./Globe";
import MainDashboard from "./MainDashboard";
export default function Main() {
  return (
    <main className="flex grow flex-col">
      <h1 className="text-main text-center text-6xl font-bold">
        Seamless onchain payments for your business
      </h1>

      <div className="flex flex-col items-center justify-center">
        <span>Powered by</span>
        <div className="flex flex-row items-center">
          <Text size="4" className="font-bold">
            Starknet
          </Text>
          <img
            src="/starknetLogo.png"
            alt="Starknet logo"
            className="ml-2 w-8"
          />
        </div>
        <Globe />

        <a href="/createBiz" className="ml-4">
          <Button>
            <RocketIcon />
            Create Business
          </Button>
        </a>

        <MainDashboard />
      </div>
    </main>
  );
}
