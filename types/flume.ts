export type HoldingHorizonDays = 7 | 30 | 90 | 365;

export type StrategyCategory =
  | "plain_lending"
  | "curated_vault"
  | "leveraged_looping"
  | "delta_neutral";

export interface RiskSignal {
  id: string;
  dimension:
    | "smart_contract"
    | "liquidity"
    | "asset"
    | "strategy"
    | "dependencies"
    | "incentives"
    | "freshness";
  severity: "low" | "medium" | "high";
  label: string;
  evidence: string;
}

export interface YieldOpportunity {
  id: string;
  protocol: string;
  market: string;
  assetSymbol: "USDC";
  assetMint: string;
  receiptShareSymbol: string;
  baseApy: number;
  rewardApy: number;
  headlineApy: number;
  tvlUsd: number | null;
  utilization: number | null;
  withdrawLiquidityUsd: number | null;
  withdrawalRestrictions: string[];
  fees: {
    depositBps: number;
    withdrawalBps: number;
  };
  strategyType: StrategyCategory;
  oracleProvider: "Pyth" | "Switchboard" | "Pyth + Switchboard";
  auditStatus: string;
  riskFlags: RiskSignal[];
  dataSource: "live_mainnet_api" | "fallback_snapshot";
  updatedAt: number;
}

export interface UserPosition {
  opportunityId: string;
  protocol: string;
  market: string;
  depositedUsdc: number;
  rawShares: string;
  shareMintAddress: string;
  currentBaseApy: number;
  currentRewardApy: number;
  lastRefreshedAt: number;
  preview: boolean;
}

export interface MigrationCostBreakdown {
  solanaBaseFeeUsd: number;
  priorityFeeUsd: number;
  sourceWithdrawalFeeUsd: number;
  destinationDepositFeeUsd: number;
  ataRentUsd: number;
  totalOneTimeCostUsd: number;
}

export interface EvaluatedOpportunity {
  opportunity: YieldOpportunity;
  isCurrentPosition: boolean;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  holdingYears: number;
  rewardHaircut: number;
  effectiveApy: number;
  netApyAfterCost: number;
  grossReturnUsd: number;
  netReturnUsd: number;
  incrementalGainVsCurrentUsd: number;
  costs: MigrationCostBreakdown;
  breakEvenDays: number | null;
  breakEvenStatus:
    | "current"
    | "instant"
    | "worth_it"
    | "exceeds_horizon"
    | "never_breaks_even";
  isLiquiditySufficient: boolean;
  expectedDestinationUsdc: number;
  minimumDestinationUsdc: number;
}

export interface SimulationResult {
  success: boolean;
  unitsConsumed: number;
  logs: string[];
  error: string | null;
  simulatedAt: number;
}

export interface OpportunitiesResponse {
  opportunities: YieldOpportunity[];
  fetchedAt: number;
  dataSource: "live_mainnet_api" | "fallback_snapshot" | "mixed";
}

export interface MigrationBuildRequest {
  owner: string;
  sourceOpportunityId: string;
  destinationOpportunityId: string;
  amountUsdc: number;
  minimumDestinationUsdc: number;
}

export interface MigrationBuildResponse {
  transaction: string;
  expectedDestinationUsdc: number;
  minimumDestinationUsdc: number;
  netWithdrawnUsdc: number;
  sourceWithdrawalFeeUsd: number;
  destinationDepositFeeUsd: number;
  blockhash: string;
}
