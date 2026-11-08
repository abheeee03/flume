export type HoldingHorizonDays = 7 | 30 | 90 | 365;
export type NetworkCluster = 'devnet' | 'mainnet-beta';

export type MigrationBuildResponse = BuiltMigrationTransaction;

export type StrategyCategory =
  | 'plain_lending'
  | 'dynamic_vault'
  | 'curated_vault'
  | 'leveraged_looping'
  | 'delta_neutral';

export interface ProtocolNetworkAddresses {
  programId: string;
  marketOrVaultAddress: string;
  reserveOrPoolAddress: string;
  collateralOrShareMint: string;
  reserveLiquiditySupply: string;
  lendingMarketAuthority: string;
  underlyingMint: string;
  explorerUrl?: string;
}

export interface RiskSignal {
  id: string;
  dimension:
    | 'smart_contract'
    | 'liquidity'
    | 'asset'
    | 'strategy'
    | 'dependencies'
    | 'incentives'
    | 'freshness';
  severity: 'low' | 'medium' | 'high';
  label: string;
  evidence: string;
}

export interface YieldOpportunity {
  id: string;
  protocol: string;
  protocolSlug: 'kamino' | 'meteora' | 'save' | 'marginfi' | 'drift';
  market: string;
  assetSymbol: 'USDC';
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
  oracleProvider: 'Pyth' | 'Switchboard' | 'Pyth + Switchboard';
  auditStatus: string;
  addresses: {
    devnet: ProtocolNetworkAddresses;
    mainnet: ProtocolNetworkAddresses;
  };
  activeAddresses: ProtocolNetworkAddresses;
  riskFlags: RiskSignal[];
  dataSource: 'live_mainnet_api' | 'fallback_snapshot';
  updatedAt: number;
}

export interface UserPosition {
  opportunityId: string;
  protocol: string;
  market: string;
  depositedUsdc: number;
  rawShares: string;
  shareMintAddress: string;
  programId: string;
  marketAddress: string;
  currentBaseApy: number;
  currentRewardApy: number;
  source: 'vybe_api' | 'onchain_rpc' | 'wallet_usdc';
  network: NetworkCluster;
  lastRefreshedAt: number;
}

export interface MigrationCostBreakdown {
  solanaBaseFeeUsd: number;
  priorityFeeUsd: number;
  swapOrRoutingFeeUsd: number;
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
    | 'current'
    | 'instant'
    | 'worth_it'
    | 'exceeds_horizon'
    | 'never_breaks_even';
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
  network: NetworkCluster;
}

export interface BuiltMigrationTransaction {
  serializedTransaction: string; // base64
  network: NetworkCluster;
  sourceProtocol: string;
  destinationProtocol: string;
  sourceProgramId: string;
  destinationProgramId: string;
  amountUsdc: number;
  netMigratedUsdc: number;
  expectedDestinationSharesUi: number;
  minimumDestinationUsdc: number;
  shareMint: string;
  usdcMint: string;
  blockhash: string;
  lastValidBlockHeight: number;
  instructionsSummary: string[];
}

export interface BuiltMigrationTransaction {
  serializedTransaction: string; // base64
  network: NetworkCluster;
  sourceProtocol: string;
  destinationProtocol: string;
  sourceProgramId: string;
  destinationProgramId: string;
  amountUsdc: number;
  netMigratedUsdc: number;
  expectedDestinationUsdc: number;
  expectedDestinationSharesUi: number;
  minimumDestinationUsdc: number;
  shareMint: string;
  usdcMint: string;
  blockhash: string;
  lastValidBlockHeight: number;
  instructionsSummary: string[];
}