import { poseidonHashMany } from "@scure/starknet";
import { hash } from "starknet";
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatSignificantDigits(
  value: string,
  maxSignificantDigits: number = 4,
): string {
  const floatVal = parseFloat(value);
  if (floatVal === 0) return "0";

  const digitsBeforeDecimal = floatVal < 1 ? 0 : value.indexOf(".");
  const allowedDecimalPlaces = maxSignificantDigits - digitsBeforeDecimal;

  const formattedValue = floatVal.toFixed(
    allowedDecimalPlaces < 0 ? 0 : allowedDecimalPlaces,
  );
  return parseFloat(formattedValue).toString();
}

export function hashCall(call: {
  contractAddress: bigint;
  entrypoint: string;
  calldata: bigint[];
}): bigint {
  const callTypeHash = hash.starknetKeccak(
    `"Call"("To":"ContractAddress","Selector":"selector","Calldata":"felt*")`,
  );
  const entrypointHash = hash.starknetKeccak(call.entrypoint);
  const calldataHash = poseidonHashMany(call.calldata);

  return poseidonHashMany([
    callTypeHash,
    call.contractAddress,
    entrypointHash,
    calldataHash,
  ]);
}

export function generateUniqueSessionId() {
  return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function hexToDate(hexTimestamp: string) {
  const timestamp = parseInt(hexTimestamp, 16);
  const date = new Date(timestamp * 1000);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
