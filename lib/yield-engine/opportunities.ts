import { MARKETS, marketById, snapshotOpportunity } from "@/config/markets";
import { evaluateRisk } from "@/lib/yield-engine/risk-evaluator";
import type { OpportunitiesResponse, YieldOpportunity } from "@/types/flume";

interface LlamaPool {
  chain?: string;
  project?: string;
  symbol?: string;
  apy?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  tvlUsd?: number | null;
}

function percentToDecimal(value: number): number {
  return value / 100;
}

function liveRates(pool: LlamaPool, fallback: YieldOpportunity): {
  baseApy: number;
  rewardApy: number;
} {
  const rewardPct = typeof pool.apyReward === "number" ? pool.apyReward : 0;
  if (typeof pool.apyBase === "number") {
    return {
      baseApy: percentToDecimal(pool.apyBase),
      rewardApy: percentToDecimal(rewardPct),
    };
  }
  if (typeof pool.apy === "number") {
    return {
      baseApy: Math.max(0, percentToDecimal(pool.apy - rewardPct)),
      rewardApy: percentToDecimal(rewardPct),
    };
  }
  return { baseApy: fallback.baseApy, rewardApy: fallback.rewardApy };
}

function pickPool(pools: LlamaPool[], project: string): LlamaPool | null {
  const matches = pools.filter(
    (pool) =>
      pool.chain === "Solana" &&
      pool.project === project &&
      pool.symbol === "USDC",
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, pool) =>
    (pool.tvlUsd ?? 0) > (best.tvlUsd ?? 0) ? pool : best,
  );
}

export async function loadOpportunities(now = Date.now()): Promise<OpportunitiesResponse> {
  const pools = await fetchLlamaPools();
  let liveCount = 0;

  const opportunities = MARKETS.map((market) => {
    const fallback = snapshotOpportunity(market, now);
    const pool = market.llamaProject ? pickPool(pools ?? [], market.llamaProject) : null;
    if (!pool) {
      const opportunity: YieldOpportunity = { ...fallback, riskFlags: [] };
      opportunity.riskFlags = evaluateRisk(opportunity, 0, now);
      return opportunity;
    }

    liveCount += 1;
    const rates = liveRates(pool, { ...fallback, riskFlags: [] });
    const opportunity: YieldOpportunity = {
      ...fallback,
      baseApy: rates.baseApy,
      rewardApy: rates.rewardApy,
      headlineApy: rates.baseApy + rates.rewardApy,
      tvlUsd: typeof pool.tvlUsd === "number" ? pool.tvlUsd : fallback.tvlUsd,
      dataSource: "live_mainnet_api",
      updatedAt: now,
      riskFlags: [],
    };
    opportunity.riskFlags = evaluateRisk(opportunity, 0, now);
    return opportunity;
  });

  const dataSource =
    liveCount === 0
      ? "fallback_snapshot"
      : liveCount === MARKETS.filter((market) => market.llamaProject).length
        ? "live_mainnet_api"
        : "mixed";

  return { opportunities, fetchedAt: now, dataSource };
}

export function opportunityById(
  opportunities: YieldOpportunity[],
  id: string,
): YieldOpportunity | null {
  return (
    opportunities.find((item) => item.id === id) ??
    (() => {
      const market = marketById(id);
      if (!market) return null;
      return { ...snapshotOpportunity(market), riskFlags: [] };
    })()
  );
}

async function fetchLlamaPools(): Promise<LlamaPool[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch("https://yields.llama.fi/pools", {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: LlamaPool[] };
    return Array.isArray(body.data) ? body.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
