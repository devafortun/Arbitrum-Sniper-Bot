import { Percent } from "@uniswap/sdk-core";
import { ethers, providers, Wallet } from "ethers";
import { config as loadEnvironmentVariables } from "dotenv";

loadEnvironmentVariables();

export const WWALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";
export const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || "";

export const CHAIN_ID = parseInt(process.env.CHAIN_ID || "1");

export const SLIPPAGE_TOLERANCE = new Percent(
  process.env.SLIPPAGE_TOLERANCE || 5,
  100
);

const RPC = process.env.RPC;
export const provider = ethers.providers.getDefaultProvider(RPC);

export const signer = new Wallet(WWALLET_PRIVATE_KEY, provider);
