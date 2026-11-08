export function toBaseUnits(amount: number, decimals = 6): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  const fixed = amount.toFixed(decimals);
  const [whole, fraction = ""] = fixed.split(".");
  const scale = BigInt(10) ** BigInt(decimals);
  return BigInt(whole) * scale + BigInt(fraction.padEnd(decimals, "0"));
}

export function fromBaseUnits(amount: bigint, decimals = 6): number {
  const scale = 10 ** decimals;
  return Number(amount) / scale;
}
