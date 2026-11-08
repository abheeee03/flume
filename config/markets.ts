import type { StrategyCategory, YieldOpportunity } from "@/types/flume";

/** Circle USDC on Solana mainnet. Yield rows describe this asset; Devnet execution uses flUSDC. */
export const MAINNET_USDC_MINT =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const SHARE_DECIMALS = 6;
export const USDC_DECIMALS = 6;

export const SOLANA_BASE_FEE_USD = 0.001;
export const PRIORITY_FEE_USD = 0.002;
export const MIN_OUTPUT_BUFFER = 0.0005;
export const DEFAULT_PRINCIPAL_USD = 5_000;
export const DEFAULT_HORIZON_DAYS = 90 as const;
export const DEFAULT_REWARD_HAIRCUT = 0.5;
export const MIN_PRINCIPAL_USD = 500;
export const MAX_PRINCIPAL_USD = 50_000;
export const PREVIEW_POSITION_ID = "save-main-usdc";

export interface MarketDefinition {
  id: string;
  protocol: string;
  market: string;
  receiptShareSymbol: string;
  baseApy: number;
  rewardApy: number;
  tvlUsd: number;
  utilization: number;
  withdrawLiquidityUsd: number;
  withdrawalRestrictions: string[];
  depositBps: number;
  withdrawalBps: number;
  strategyType: StrategyCategory;
  oracleProvider: YieldOpportunity["oracleProvider"];
  auditStatus: string;
  /** DefiLlama `project` slug used to merge a live USDC pool, when one exists. */
  llamaProject: string | null;
  /** When several pools match, prefer symbols that include every token in this list. */
  symbolHints: string[];
}

export const MARKETS: MarketDefinition[] = [
  {
    id: "save-main-usdc",
    protocol: "Save",
    market: "Main Pool",
    receiptShareSymbol: "flSAVE",
    baseApy: 0.052,
    rewardApy: 0.002,
    tvlUsd: 18_400_000,
    utilization: 0.68,
    withdrawLiquidityUsd: 18_400_000,
    withdrawalRestrictions: ["Instant if utilization < 95%"],
    depositBps: 0,
    withdrawalBps: 0,
    strategyType: "plain_lending",
    oracleProvider: "Pyth",
    auditStatus: "Kudelski Security, 2022",
    llamaProject: "save",
    symbolHints: ["USDC"],
  },
  {
    id: "kamino-main-usdc",
    protocol: "Kamino Lend",
    market: "Main Market",
    receiptShareSymbol: "flKMNO",
    baseApy: 0.0815,
    rewardApy: 0.0045,
    tvlUsd: 64_200_000,
    utilization: 0.76,
    withdrawLiquidityUsd: 64_200_000,
    withdrawalRestrictions: ["Instant if utilization < 95%"],
    depositBps: 0,
    withdrawalBps: 0,
    strategyType: "plain_lending",
    oracleProvider: "Pyth + Switchboard",
    auditStatus: "OtterSec, 2024",
    llamaProject: "kamino-lend",
    symbolHints: ["USDC"],
  },
  {
    id: "marginfi-main-usdc",
    protocol: "Marginfi",
    market: "Main Pool",
    receiptShareSymbol: "flMRGN",
    baseApy: 0.074,
    rewardApy: 0,
    tvlUsd: 31_000_000,
    utilization: 0.72,
    withdrawLiquidityUsd: 31_000_000,
    withdrawalRestrictions: ["Instant if utilization < 95%"],
    depositBps: 0,
    withdrawalBps: 0,
    strategyType: "plain_lending",
    oracleProvider: "Pyth + Switchboard",
    auditStatus: "OtterSec, 2023",
    llamaProject: "marginfi",
    symbolHints: ["USDC"],
  },
  {
    id: "kamino-jlp-loop-usdc",
    protocol: "Kamino",
    market: "Multiply Loop Vault",
    receiptShareSymbol: "flLOOP",
    baseApy: 0.036,
    rewardApy: 0.072,
    tvlUsd: 3_500,
    utilization: 0.93,
    withdrawLiquidityUsd: 3_500,
    withdrawalRestrictions: [
      "Withdrawals can be capped while the loop is above 90% utilization",
      "Unwinding leverage can delay an exit",
    ],
    depositBps: 10,
    withdrawalBps: 15,
    strategyType: "leveraged_looping",
    oracleProvider: "Pyth + Switchboard",
    auditStatus: "OtterSec, 2024",
    llamaProject: null,
    symbolHints: [],
  },
  {
    id: "drift-earn-usdc",
    protocol: "Drift",
    market: "Earn Vault",
    receiptShareSymbol: "flDRFT",
    baseApy: 0.079,
    rewardApy: 0.008,
    tvlUsd: 12_100_000,
    utilization: 0.84,
    withdrawLiquidityUsd: 12_100_000,
    withdrawalRestrictions: [
      "Vault allocations may settle before a withdrawal completes",
    ],
    depositBps: 0,
    withdrawalBps: 10,
    strategyType: "curated_vault",
    oracleProvider: "Pyth",
    auditStatus: "Trail of Bits, 2023",
    llamaProject: "drift-protocol",
    symbolHints: ["USDC"],
  },
];

export function marketById(id: string): MarketDefinition | undefined {
  return MARKETS.find((market) => market.id === id);
}

export function snapshotOpportunity(
  market: MarketDefinition,
  now = Date.now(),
): Omit<YieldOpportunity, "riskFlags"> {
  return {
    id: market.id,
    protocol: market.protocol,
    market: market.market,
    assetSymbol: "USDC",
    assetMint: MAINNET_USDC_MINT,
    receiptShareSymbol: market.receiptShareSymbol,
    baseApy: market.baseApy,
    rewardApy: market.rewardApy,
    headlineApy: market.baseApy + market.rewardApy,
    tvlUsd: market.tvlUsd,
    utilization: market.utilization,
    withdrawLiquidityUsd: market.withdrawLiquidityUsd,
    withdrawalRestrictions: market.withdrawalRestrictions,
    fees: {
      depositBps: market.depositBps,
      withdrawalBps: market.withdrawalBps,
    },
    strategyType: market.strategyType,
    oracleProvider: market.oracleProvider,
    auditStatus: market.auditStatus,
    dataSource: "fallback_snapshot",
    updatedAt: now,
  };
}
