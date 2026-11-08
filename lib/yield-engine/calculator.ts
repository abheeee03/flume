import {
  MIN_OUTPUT_BUFFER,
  PRIORITY_FEE_USD,
  SOLANA_BASE_FEE_USD,
} from "@/config/markets";
import type {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  MigrationCostBreakdown,
  YieldOpportunity,
} from "@/types/flume";

export interface EvaluateInput {
  opportunity: YieldOpportunity;
  /** Market the wallet is leaving. Null compares each row with a fresh deposit. */
  current: YieldOpportunity | null;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  /**
   * Fraction of reward APY that counts toward net return.
   * 0 ignores incentives, 1 counts the full headline reward.
   */
  rewardHaircut: number;
}

function clampHaircut(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function effectiveApy(
  opportunity: YieldOpportunity,
  rewardHaircut: number,
): number {
  return opportunity.baseApy + opportunity.rewardApy * clampHaircut(rewardHaircut);
}

/**
 * One-time cost of moving `principalUsd` into `destination`.
 * Staying put costs nothing. A move pays the source market's withdrawal fee,
 * then the destination's own withdrawal and deposit schedule. Charging the
 * destination withdrawal fee up front is what makes Drift's 10 bps and the
 * loop vault's 25 bps show up in the horizon comparison.
 */
export function migrationCosts(
  principalUsd: number,
  source: YieldOpportunity | null,
  destination: YieldOpportunity,
  isCurrentPosition: boolean,
): MigrationCostBreakdown {
  if (isCurrentPosition || principalUsd <= 0) {
    return {
      solanaBaseFeeUsd: 0,
      priorityFeeUsd: 0,
      sourceWithdrawalFeeUsd: 0,
      destinationDepositFeeUsd: 0,
      ataRentUsd: 0,
      totalOneTimeCostUsd: 0,
    };
  }

  const sourceBps = source?.fees.withdrawalBps ?? 0;
  const leaveFee = principalUsd * (sourceBps / 10_000);
  const afterLeave = principalUsd - leaveFee;
  const destinationWithdrawalFee =
    afterLeave * (destination.fees.withdrawalBps / 10_000);
  const afterWithdrawal = afterLeave - destinationWithdrawalFee;
  const destinationDepositFeeUsd =
    afterWithdrawal * (destination.fees.depositBps / 10_000);

  const sourceWithdrawalFeeUsd = leaveFee + destinationWithdrawalFee;
  const solanaBaseFeeUsd = SOLANA_BASE_FEE_USD;
  const priorityFeeUsd = PRIORITY_FEE_USD;

  return {
    solanaBaseFeeUsd,
    priorityFeeUsd,
    sourceWithdrawalFeeUsd,
    destinationDepositFeeUsd,
    ataRentUsd: 0,
    totalOneTimeCostUsd:
      solanaBaseFeeUsd +
      priorityFeeUsd +
      sourceWithdrawalFeeUsd +
      destinationDepositFeeUsd,
  };
}

export function settlementAmounts(
  principalUsd: number,
  source: YieldOpportunity | null,
  destination: YieldOpportunity,
  isCurrentPosition: boolean,
): { netWithdrawnUsdc: number; expectedDestinationUsdc: number } {
  if (isCurrentPosition || principalUsd <= 0) {
    return {
      netWithdrawnUsdc: principalUsd,
      expectedDestinationUsdc: principalUsd,
    };
  }

  const costs = migrationCosts(principalUsd, source, destination, false);
  const leaveFee = principalUsd * ((source?.fees.withdrawalBps ?? 0) / 10_000);
  const netWithdrawnUsdc = principalUsd - leaveFee;
  const expectedDestinationUsdc =
    netWithdrawnUsdc -
    (costs.sourceWithdrawalFeeUsd - leaveFee) -
    costs.destinationDepositFeeUsd;

  return { netWithdrawnUsdc, expectedDestinationUsdc };
}

export function evaluateOpportunity(input: EvaluateInput): EvaluatedOpportunity {
  const rewardHaircut = clampHaircut(input.rewardHaircut);
  const principalUsd = Number.isFinite(input.principalUsd)
    ? Math.max(0, input.principalUsd)
    : 0;
  const holdingDays = input.holdingDays;
  const holdingYears = holdingDays / 365;
  const isCurrentPosition = input.current?.id === input.opportunity.id;
  const rate = effectiveApy(input.opportunity, rewardHaircut);
  const currentRate =
    input.current == null ? 0 : effectiveApy(input.current, rewardHaircut);
  const costs = migrationCosts(
    principalUsd,
    input.current,
    input.opportunity,
    isCurrentPosition,
  );

  const grossReturnUsd = principalUsd * rate * holdingYears;
  const netReturnUsd = grossReturnUsd - costs.totalOneTimeCostUsd;
  const currentKeepReturnUsd = principalUsd * currentRate * holdingYears;
  const incrementalGainVsCurrentUsd =
    input.current == null ? netReturnUsd : netReturnUsd - currentKeepReturnUsd;
  const netApyAfterCost =
    principalUsd > 0 && holdingYears > 0
      ? rate - costs.totalOneTimeCostUsd / (principalUsd * holdingYears)
      : rate;

  let breakEvenDays: number | null;
  let breakEvenStatus: EvaluatedOpportunity["breakEvenStatus"];

  if (isCurrentPosition) {
    breakEvenDays = 0;
    breakEvenStatus = "current";
  } else if (rate <= currentRate || principalUsd <= 0) {
    breakEvenDays = null;
    breakEvenStatus = "never_breaks_even";
  } else {
    breakEvenDays =
      (costs.totalOneTimeCostUsd / (principalUsd * (rate - currentRate))) * 365;
    if (breakEvenDays <= 0.01) breakEvenStatus = "instant";
    else if (breakEvenDays <= holdingDays) breakEvenStatus = "worth_it";
    else breakEvenStatus = "exceeds_horizon";
  }

  const liquidity = input.opportunity.withdrawLiquidityUsd;
  const isLiquiditySufficient = liquidity == null || principalUsd <= liquidity;
  const { expectedDestinationUsdc } = settlementAmounts(
    principalUsd,
    input.current,
    input.opportunity,
    isCurrentPosition,
  );

  return {
    opportunity: input.opportunity,
    isCurrentPosition,
    principalUsd,
    holdingDays,
    holdingYears,
    rewardHaircut,
    effectiveApy: rate,
    netApyAfterCost,
    grossReturnUsd,
    netReturnUsd,
    incrementalGainVsCurrentUsd,
    costs,
    breakEvenDays,
    breakEvenStatus,
    isLiquiditySufficient,
    expectedDestinationUsdc,
    minimumDestinationUsdc: expectedDestinationUsdc * (1 - MIN_OUTPUT_BUFFER),
  };
}
