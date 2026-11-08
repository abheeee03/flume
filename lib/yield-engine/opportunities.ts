// lib/yield-engine/opportunities.ts
import {
  CURATED_MARKETS,
  getActiveUsdcMint,
  isDevnetMode,
} from '@/config/markets';
import { evaluateMarketRisks } from './risk-evaluator';
import { YieldOpportunity } from '@/types/flume';

export function getBaselineOpportunities(): YieldOpportunity[] {
  const devnet = isDevnetMode();
  const activeUsdcMint = getActiveUsdcMint();
  const now = Date.now();

  return CURATED_MARKETS.map((item) => {
    const activeAddresses = devnet
      ? item.addresses.devnet
      : item.addresses.mainnet;

    const partial: Omit<YieldOpportunity, 'riskFlags'> = {
      ...item,
      assetMint: activeUsdcMint,
      activeAddresses,
      updatedAt: now,
    };

    return {
      ...partial,
      riskFlags: evaluateMarketRisks(partial, 5000),
    };
  });
}