import { NextResponse } from 'next/server';
import {
  CURATED_MARKETS,
  USDC_MINTS,
  getActiveCluster,
  isDevnetMode,
} from '@/config/markets';
import {
  ManagedSymbol,
  getDeterministicMintAddresses,
} from '@/lib/solana/devnet-mint-manager';
import { evaluateMarketRisks } from '@/lib/yield-engine/risk-evaluator';
import { YieldOpportunity } from '@/types/flume';

interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number | null;
}

interface MeteoraVaultInfo {
  vault_address: string;
  token_address: string;
  closest_apy: number;
  earned_amount: number;
  total_amount: number;
}

let cachedOpportunities: {
  data: YieldOpportunity[];
  timestamp: number;
  cluster: string;
} | null = null;

export async function GET() {
  const devnet = isDevnetMode();
  const cluster = getActiveCluster();

  if (
    cachedOpportunities &&
    cachedOpportunities.cluster === cluster &&
    Date.now() - cachedOpportunities.timestamp < 45_000
  ) {
    return NextResponse.json({
      opportunities: cachedOpportunities.data,
      cluster,
      devnet,
      updatedAt: cachedOpportunities.timestamp,
    });
  }

  const devnetMints = getDeterministicMintAddresses();
  let llamaPools: LlamaPool[] = [];
  let meteoraUsdcApy: number | null = null;
  let liveSuccess = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const [llamaRes, meteoraRes] = await Promise.allSettled([
      fetch('https://yields.llama.fi/pools', {
        signal: controller.signal,
        next: { revalidate: 60 },
      }),
      fetch('https://merv2-api.meteora.ag/vault_info', {
        signal: controller.signal,
        next: { revalidate: 60 },
      }),
    ]);

    clearTimeout(timeout);

    if (llamaRes.status === 'fulfilled' && llamaRes.value.ok) {
      const json = await llamaRes.value.json();
      if (Array.isArray(json?.data)) {
        llamaPools = (json.data as LlamaPool[]).filter(
          (p) =>
            p.chain === 'Solana' &&
            p.symbol?.toUpperCase().includes('USDC') &&
            p.tvlUsd > 250_000
        );
        liveSuccess = llamaPools.length > 0;
      }
    }

    if (meteoraRes.status === 'fulfilled' && meteoraRes.value.ok) {
      const vaults = (await meteoraRes.value.json()) as MeteoraVaultInfo[];
      const usdcVault = Array.isArray(vaults)
        ? vaults.find(
            (v) =>
              v.token_address ===
              'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          )
        : undefined;
      if (usdcVault && typeof usdcVault.closest_apy === 'number') {
        meteoraUsdcApy = usdcVault.closest_apy / 100;
        liveSuccess = true;
      }
    }
  } catch (err) {
    console.warn('[Flume /api/opportunities] Using deterministic fallback:', err);
  }

  const now = Date.now();

  const opportunities: YieldOpportunity[] = CURATED_MARKETS.map((item) => {
    let baseApy = item.baseApy;
    let rewardApy = item.rewardApy;
    let tvlUsd = item.tvlUsd;
    let source: YieldOpportunity['dataSource'] = 'fallback_snapshot';

    // Match live Mainnet pools
    if (item.id === 'kamino-main-usdc') {
      const match = llamaPools
        .filter(
          (p) =>
            p.project.toLowerCase().includes('kamino') &&
            p.symbol.toUpperCase() === 'USDC'
        )
        .sort((a, b) => b.tvlUsd - a.tvlUsd)[0];

      if (match && match.apy !== null) {
        baseApy = (match.apyBase ?? match.apy) / 100;
        rewardApy = (match.apyReward ?? 0) / 100;
        tvlUsd = Math.round(match.tvlUsd);
        source = 'live_mainnet_api';
      }
    } else if (item.id === 'meteora-dynamic-usdc') {
      if (meteoraUsdcApy !== null && meteoraUsdcApy > 0) {
        baseApy = meteoraUsdcApy;
        source = 'live_mainnet_api';
      } else {
        const match = llamaPools.find(
          (p) =>
            p.project.toLowerCase().includes('meteora') &&
            p.symbol.toUpperCase() === 'USDC'
        );
        if (match && match.apy !== null) {
          baseApy = (match.apyBase ?? match.apy) / 100;
          rewardApy = (match.apyReward ?? 0) / 100;
          tvlUsd = Math.round(match.tvlUsd);
          source = 'live_mainnet_api';
        }
      }
    } else if (item.id === 'save-main-usdc') {
      const match = llamaPools.find(
        (p) =>
          (p.project.toLowerCase().includes('save') ||
            p.project.toLowerCase().includes('solend')) &&
          p.symbol.toUpperCase() === 'USDC'
      );
      if (match && match.apy !== null) {
        baseApy = (match.apyBase ?? match.apy) / 100;
        rewardApy = (match.apyReward ?? 0) / 100;
        tvlUsd = Math.round(match.tvlUsd);
        source = 'live_mainnet_api';
      }
    } else if (item.id === 'marginfi-main-usdc') {
      const match = llamaPools.find(
        (p) =>
          p.project.toLowerCase().includes('marginfi') &&
          p.symbol.toUpperCase() === 'USDC'
      );
      if (match && match.apy !== null) {
        baseApy = (match.apyBase ?? match.apy) / 100;
        rewardApy = (match.apyReward ?? 0) / 100;
        tvlUsd = Math.round(match.tvlUsd);
        source = 'live_mainnet_api';
      }
    } else if (item.id === 'drift-earn-usdc') {
      const match = llamaPools.find(
        (p) =>
          p.project.toLowerCase().includes('drift') &&
          p.symbol.toUpperCase() === 'USDC'
      );
      if (match && match.apy !== null) {
        baseApy = (match.apyBase ?? match.apy) / 100;
        rewardApy = (match.apyReward ?? 0) / 100;
        tvlUsd = Math.round(match.tvlUsd);
        source = 'live_mainnet_api';
      }
    } else if (liveSuccess) {
      source = 'live_mainnet_api';
    }

    const shareSym = item.receiptShareSymbol as ManagedSymbol;
    const resolvedDevnetAddresses = {
      ...item.addresses.devnet,
      collateralOrShareMint:
        devnetMints[shareSym] || item.addresses.devnet.collateralOrShareMint,
      underlyingMint: devnetMints.flUSDC || USDC_MINTS.devnet,
    };

    const activeAddresses = devnet
      ? resolvedDevnetAddresses
      : item.addresses.mainnet;

    const headlineApy = Number((baseApy + rewardApy).toFixed(6));

    const partial: Omit<YieldOpportunity, 'riskFlags'> = {
      ...item,
      assetMint: activeAddresses.underlyingMint,
      baseApy: Number(baseApy.toFixed(6)),
      rewardApy: Number(rewardApy.toFixed(6)),
      headlineApy,
      tvlUsd,
      addresses: {
        devnet: resolvedDevnetAddresses,
        mainnet: item.addresses.mainnet,
      },
      activeAddresses,
      dataSource: source,
      updatedAt: now,
    };

    return {
      ...partial,
      riskFlags: evaluateMarketRisks(partial, 5000),
    };
  });

  cachedOpportunities = {
    data: opportunities,
    timestamp: now,
    cluster,
  };

  return NextResponse.json({
    opportunities,
    cluster,
    devnet,
    updatedAt: now,
  });
}