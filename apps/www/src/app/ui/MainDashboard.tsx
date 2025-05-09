"use client";
import { useEffect, useState } from "react";
import { Contract, RpcProvider, constants, num } from "starknet";

import abi from "../../abis/abi";

import { useUser } from "@/contexts/UserContext";

export default function MainDashboard() {
  const userContext = useUser();

  return <div></div>;
}
