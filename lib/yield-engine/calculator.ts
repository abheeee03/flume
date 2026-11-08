import {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  MigrationCostBreakdown,
  UserPosition,
  YieldOpportunity,
} from '@/types/flume';
import { evaluateMarketRisks } from './risk-evaluator';

const SOLANA_BASE_FEE_USD = 0.001;
const PRIORITY_FEE_USD = 0.002;
const SLIPPAGE_GUARD_BUFFER = 0.0005; // 0.05%

export function evaluateOpportunity(params: {
  opportunity: YieldOpportunity;
  currentPosition: UserPosition | null;
  sourceOpportunity?: { fees: { withdrawalBps: number } } | null;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  rewardHaircut: number; // 0.0 to 1.0
}): EvaluatedOpportunity {
  const {
    opportunity,
    currentPosition,
    sourceOpportunity,
    principalUsd,
    holdingDays,
    rewardHaircut,
  } = params;

  const isCurrentPosition =
    currentPosition?.opportunityId === opportunity.id;
  const holdingYears = holdingDays / 365;

  const effectiveApy =
    opportunity.baseApy + opportunity.rewardApy * rewardHaircut;

  const currentEffectiveApy = currentPosition
    ? currentPosition.currentBaseApy +
      currentPosition.currentRewardApy * rewardHaircut
    : 0;

  // Calculate migration fees
  let costs: MigrationCostBreakdown;
  if (isCurrentPosition || principalUsd <= 0) {
    costs = {
      solanaBaseFeeUsd: 0,
      priorityFeeUsd: 0,
      swapOrRoutingFeeUsd: 0,
      sourceWithdrawalFeeUsd: 0,
      destinationDepositFeeUsd: 0,
      ataRentUsd: 0,
      totalOneTimeCostUsd: 0,
    };
  } else {
    const sourceWithdrawBps = sourceOpportunity?.fees.withdrawalBps ?? 0;
    const destDepositBps = opportunity.fees.depositBps ?? 0;

    const sourceWithdrawalFeeUsd =
      principalUsd * (sourceWithdrawBps / 10000);
    const amountAfterWithdraw = principalUsd - sourceWithdrawalFeeUsd;
    const destinationDepositFeeUsd =
      amountAfterWithdraw * (destDepositBps / 10000);

    const totalOneTimeCostUsd =
      SOLANA_BASE_FEE_USD +
      PRIORITY_FEE_USD +
      sourceWithdrawalFeeUsd +
      destinationDepositFeeUsd;

    costs = {
      solanaBaseFeeUsd: SOLANA_BASE_FEE_USD,
      priorityFeeUsd: PRIORITY_FEE_USD,
      swapOrRoutingFeeUsd: 0,
      sourceWithdrawalFeeUsd,
      destinationDepositFeeUsd,
      ataRentUsd: 0,
      totalOneTimeCostUsd,
    };
  }

  const grossReturnUsd = principalUsd * effectiveApy * holdingYears;
  const netReturnUsd = grossReturnUsd - costs.totalOneTimeCostUsd;

  const netApyAfterCost =
    principalUsd > 0 && holdingYears > 0
      ? effectiveApy -
        costs.totalOneTimeCostUsd / (principalUsd * holdingYears)
      : effectiveApy;

  const currentKeepReturnUsd = currentPosition
    ? principalUsd * currentEffectiveApy * holdingYears
    : 0;

  const incrementalGainVsCurrentUsd = isCurrentPosition
    ? 0
    : netReturnUsd - currentKeepReturnUsd;

  // Break-even calculation
  let breakEvenDays: number | null = null;
  let breakEvenStatus: EvaluatedOpportunity['breakEvenStatus'] = 'worth_it';

  if (isCurrentPosition) {
    breakEvenDays = 0;
    breakEvenStatus = 'current';
  } else if (effectiveApy <= currentEffectiveApy || principalUsd <= 0) {
    breakEvenDays = null;
    breakEvenStatus = 'never_breaks_even';
  } else {
    const rateDiff = effectiveApy - currentEffectiveApy;
    breakEvenDays =
      (costs.totalOneTimeCostUsd / (principalUsd * rateDiff)) * 365;

    if (breakEvenDays <= 0.05) {
      breakEvenStatus = 'instant';
    } else if (breakEvenDays <= holdingDays) {
      breakEvenStatus = 'worth_it';
    } else {
      breakEvenStatus = 'exceeds_horizon';
    }
  }

  const isLiquiditySufficient =
    opportunity.withdrawLiquidityUsd === null ||
    principalUsd <= opportunity.withdrawLiquidityUsd;

  const expectedDestinationUsdc = Math.max(
    0,
    principalUsd -
      costs.sourceWithdrawalFeeUsd -
      costs.destinationDepositFeeUsd
  );

  const minimumDestinationUsdc =
    expectedDestinationUsdc * (1 - SLIPPAGE_GUARD_BUFFER);

  const dynamicRiskFlags = evaluateMarketRisks(opportunity, principalUsd);

  return {
    opportunity: {
      ...opportunity,
      riskFlags: dynamicRiskFlags,
    },
    isCurrentPosition,
    principalUsd,
    holdingDays,
    holdingYears,
    rewardHaircut,
    effectiveApy,
    netApyAfterCost,
    grossReturnUsd,
    netReturnUsd,
    incrementalGainVsCurrentUsd,
    costs,
    breakEvenDays,
    breakEvenStatus,
    isLiquiditySufficient,
    expectedDestinationUsdc,
    minimumDestinationUsdc,
  };
}