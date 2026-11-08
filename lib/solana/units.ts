// lib/solana/units.ts
export const USDC_DECIMALS = 6;

export function uiToRawUsdc(uiAmount: number): bigint {
  return BigInt(Math.round(uiAmount * 10 ** USDC_DECIMALS));
}

export function rawToUiUsdc(rawAmount: bigint | string | number): number {
  return Number(rawAmount) / 10 ** USDC_DECIMALS;
}