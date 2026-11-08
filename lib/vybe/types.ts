/**
 * TypeScript types for Vybe Network Solana API (v4).
 * Reference: https://docs.vybenetwork.com/reference/get_defi_accounts_v4_proxy
 * Reference: https://docs.vybenetwork.com/docs/defi-positions
 */

export type VybeElementType =
  | "borrowlend"
  | "liquidity"
  | "leverage"
  | "trade"
  | "multiple";

export interface VybeAssetYield {
  apr?: number;
  apy?: number;
}

export interface VybeTokenAssetData {
  address: string;
  amount: number;
  price?: number | null;
  yield?: VybeAssetYield;
}

export interface VybeAsset {
  type: "token" | "generic" | "collectible";
  networkId: "solana";
  value?: number | null;
  name?: string;
  imageUri?: string;
  attributes?: Record<string, unknown>;
  ref?: string;
  sourceRefs?: Array<{ name: string; address: string }>;
  link?: string;
  data?: VybeTokenAssetData | Record<string, unknown>;
}

export interface VybeBorrowLendData {
  value?: number | null;
  suppliedAssets?: VybeAsset[];
  borrowedAssets?: VybeAsset[];
  rewardAssets?: VybeAsset[];
  suppliedValue?: number | null;
  borrowedValue?: number | null;
  rewardValue?: number | null;
  suppliedYields?: VybeAssetYield[][];
  borrowedYields?: VybeAssetYield[][];
  healthRatio?: number | null;
  ref?: string;
  sourceRefs?: Array<{ name: string; address: string }>;
  link?: string;
}

export interface VybeLiquidityPoolAsset {
  assets?: VybeAsset[];
  assetsValue?: number | null;
  rewardAssets?: VybeAsset[];
  rewardAssetsValue?: number | null;
  value?: number | null;
  yields?: VybeAssetYield[];
  name?: string;
  ref?: string;
  sourceRefs?: Array<{ name: string; address: string }>;
  link?: string;
}

export interface VybeLiquidityData {
  liquidities?: VybeLiquidityPoolAsset[];
}

export interface VybePortfolioElement {
  type: VybeElementType;
  networkId: "solana";
  platformId: string; // e.g. "kamino", "marginfi", "save", "drift", "orca", "raydium"
  value: number | null; // USD value
  label: string; // e.g. "Lending", "LiquidityPool", "Leverage", "Vault"
  name?: string;
  tags?: string[];
  netApy?: number;
  data: VybeBorrowLendData & VybeLiquidityData & Record<string, unknown>;
}

export interface VybeDefiPositionsResponse {
  message: string;
  data: {
    portfolio: VybePortfolioElement[];
  };
  partial_failures?: string[] | null;
}

export interface VybePositionsApiResponse {
  success: boolean;
  source: "vybe_network" | "devnet_fallback" | "unconfigured";
  positions: Array<{
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
    platformId?: string;
    healthRatio?: number | null;
  }>;
  message?: string;
}
