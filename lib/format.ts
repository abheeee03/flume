import type { HoldingHorizonDays } from "@/types/flume";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(value: number): string {
  return usd.format(value);
}

export function formatUsdCompact(value: number): string {
  return usdCompact.format(value);
}

export function formatFeeUsd(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  }
  return formatUsd(value);
}
export function formatSignedUsd(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${usd.format(value)}`;
}

export function formatPercent(decimal: number, digits = 2): string {
  return `${(decimal * 100).toFixed(digits)}%`;
}

export function formatShares(value: number): string {
  return numberFormat.format(value);
}

export function formatDays(days: number): string {
  return `${days.toFixed(1)} days`;
}

export function horizonLabel(days: HoldingHorizonDays): string {
  return days === 365 ? "365 days" : `${days} days`;
}
