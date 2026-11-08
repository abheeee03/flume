import type { RiskSignal, YieldOpportunity } from "@/types/flume";

const STALE_MS = 5 * 60 * 1000;

function usd(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function evaluateRisk(
  opportunity: YieldOpportunity,
  principalUsd: number,
  now = Date.now(),
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { utilization } = opportunity;

  if (utilization != null && utilization >= 0.9) {
    const pct = Math.round(utilization * 100);
    signals.push({
      id: `${opportunity.id}-utilization-high`,
      dimension: "liquidity",
      severity: "high",
      label: `Utilization ${pct}%: withdrawals may be delayed`,
      evidence:
        "Over 90% of supplied USDC is currently borrowed. Large withdrawals may be queued or capped until borrowers repay.",
    });
  } else if (utilization != null && utilization >= 0.8) {
    const pct = Math.round(utilization * 100);
    signals.push({
      id: `${opportunity.id}-utilization-medium`,
      dimension: "liquidity",
      severity: "medium",
      label: `Utilization ${pct}%: elevated borrow demand`,
      evidence: "Pool utilization exceeds 80%.",
    });
  }

  if (
    opportunity.withdrawLiquidityUsd != null &&
    principalUsd > opportunity.withdrawLiquidityUsd
  ) {
    signals.push({
      id: `${opportunity.id}-liquidity-shortfall`,
      dimension: "liquidity",
      severity: "high",
      label: `Available liquidity ($${usd(opportunity.withdrawLiquidityUsd)}) below position size`,
      evidence:
        "Your position exceeds the immediately withdrawable liquidity in this pool.",
    });
  }

  const rewardShare =
    opportunity.headlineApy > 0
      ? opportunity.rewardApy / opportunity.headlineApy
      : 0;
  if (rewardShare >= 0.4) {
    signals.push({
      id: `${opportunity.id}-incentive-heavy`,
      dimension: "incentives",
      severity: "high",
      label: `Incentive-heavy yield (${Math.round(rewardShare * 100)}% rewards)`,
      evidence:
        "Over 40% of headline APY is paid in volatile emission tokens rather than organic borrower interest.",
    });
  }

  if (opportunity.strategyType === "leveraged_looping") {
    signals.push({
      id: `${opportunity.id}-loop`,
      dimension: "strategy",
      severity: "high",
      label: "Strategy: leveraged looping",
      evidence:
        "Uses recursive borrow/lend leverage. Exposed to borrow rate spikes and liquidation thresholds.",
    });
  }

  if (opportunity.strategyType === "curated_vault") {
    signals.push({
      id: `${opportunity.id}-vault`,
      dimension: "dependencies",
      severity: "medium",
      label: "Curated vault: external manager dependency",
      evidence:
        "Relies on vault allocation logic and underlying protocol dependencies.",
    });
  }

  if (now - opportunity.updatedAt > STALE_MS) {
    signals.push({
      id: `${opportunity.id}-stale`,
      dimension: "freshness",
      severity: "medium",
      label: "Data stale: >5m old",
      evidence: "Market snapshot is older than 5 minutes; rates may have changed.",
    });
  }

  return signals;
}
