import { sha256 } from "@noble/hashes/sha2.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MARKETS } from "@/config/markets";

export const DEMO_AUTHORITY_SEED = "flume-devnet-demo-authority-v1";
export const DEMO_USDC_SYMBOL = "flUSDC";

export function demoKeypair(label: string): Keypair {
  const seed = sha256(new TextEncoder().encode(label));
  return Keypair.fromSeed(seed);
}

export function demoMintAddress(symbol: string): PublicKey {
  return demoKeypair(`${DEMO_AUTHORITY_SEED}:${symbol}`).publicKey;
}

export function demoUsdcMint(): PublicKey {
  return demoMintAddress(DEMO_USDC_SYMBOL);
}

export function shareMintAddress(opportunityId: string): PublicKey | null {
  const market = MARKETS.find((item) => item.id === opportunityId);
  if (!market) return null;
  return demoMintAddress(market.receiptShareSymbol);
}
