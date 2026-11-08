import { CURATED_MARKETS, getActiveCluster } from '@/config/markets';
import { UserPosition } from '@/types/flume';

const VYBE_BASE_URL =
  process.env.VYBE_DATA_API_BASE || 'https://api.vybenetwork.xyz';

interface VybeDefiPositionItem {
  protocolName?: string;
  protocol?: string;
  platform?: string;
  programId?: string;
  marketAddress?: string;
  poolAddress?: string;
  vaultAddress?: string;
  symbol?: string;
  tokenSymbol?: string;
  mintAddress?: string;
  valueUsd?: number;
  amountUsd?: number;
  depositedUsd?: number;
  netValueUsd?: number;
  amount?: number;
  uiAmount?: number;
  rawAmount?: string;
  apy?: number;
  supplyApy?: number;
}

interface VybeTokenBalanceItem {
  mintAddress: string;
  symbol?: string;
  name?: string;
  amount?: number;
  uiAmount?: number;
  valueUsd?: number;
   priceUsd?: number;
  decimals?: number;
}

function matchOpportunityFromVybeItem(item: VybeDefiPositionItem) {
  const proto = (
    item.protocolName ||
    item.protocol ||
    item.platform ||
    ''
  ).toLowerCase();
  const program = item.programId || '';

  if (
    proto.includes('kamino') ||
    program === 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD'
  ) {
    if (proto.includes('multiply') || proto.includes('loop')) {
      return CURATED_MARKETS.find((m) => m.id === 'kamino-jlp-loop-usdc');
    }
    return CURATED_MARKETS.find((m) => m.id === 'kamino-main-usdc');
  }

  if (
    proto.includes('meteora') ||
    program === '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi' ||
    program === 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
  ) {
    return CURATED_MARKETS.find((m) => m.id === 'meteora-dynamic-usdc');
  }

  if (
    proto.includes('save') ||
    proto.includes('solend') ||
    program === 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'
  ) {
    return CURATED_MARKETS.find((m) => m.id === 'save-main-usdc');
  }

  if (
    proto.includes('marginfi') ||
    program === 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'
  ) {
    return CURATED_MARKETS.find((m) => m.id === 'marginfi-main-usdc');
  }

  if (
    proto.includes('drift') ||
    program === 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'
  ) {
    return CURATED_MARKETS.find((m) => m.id === 'drift-earn-usdc');
  }

  return undefined;
}

/**
 * Fetches a user's yield-invested protocol positions & wallet token balances via Vybe Network API.
 */
export async function fetchVybeUserPositions(ownerAddress: string): Promise<{
  positions: UserPosition[];
  usdcWalletBalance: number | null;
  vybeAuthenticated: boolean;
}> {
  const apiKey =
    process.env.VYBE_API_KEY ||
    process.env.VYBE_DATA_API_KEY ||
    process.env.NEXT_PUBLIC_VYBE_API_KEY;

  if (!apiKey) {
    return {
      positions: [],
      usdcWalletBalance: null,
      vybeAuthenticated: false,
    };
  }

  const headers: Record<string, string> = {
    'X-API-KEY': apiKey,
    Accept: 'application/json',
  };

  const cluster = getActiveCluster();
  const positions: UserPosition[] = [];
  let usdcWalletBalance: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const [defiRes, balanceRes] = await Promise.allSettled([
      fetch(`${VYBE_BASE_URL}/v4/wallets/${ownerAddress}/defi-positions`, {
        headers,
        signal: controller.signal,
        next: { revalidate: 15 },
      }),
      fetch(
        `${VYBE_BASE_URL}/v4/wallets/${ownerAddress}/token-balance?limit=100`,
        {
          headers,
          signal: controller.signal,
          next: { revalidate: 15 },
        }
      ),
    ]);

    clearTimeout(timeout);

    // 1. Parse Vybe DeFi Positions (/v4/wallets/{ownerAddress}/defi-positions)
    if (defiRes.status === 'fulfilled' && defiRes.value.ok) {
      const payload = await defiRes.value.json();
      const rawList: VybeDefiPositionItem[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.positions)
        ? payload.positions
        : [];

      for (const item of rawList) {
        const matched = matchOpportunityFromVybeItem(item);
        if (!matched) continue;

        const usdVal =
          item.valueUsd ??
          item.depositedUsd ??
          item.netValueUsd ??
          item.amountUsd ??
          item.uiAmount ??
          item.amount ??
          0;

        if (usdVal <= 0.01) continue;

        const addrConfig =
          cluster === 'devnet'
            ? matched.addresses.devnet
            : matched.addresses.mainnet;

        positions.push({
          opportunityId: matched.id,
          protocol: matched.protocol,
          market: matched.market,
          depositedUsdc: Number(usdVal.toFixed(2)),
          rawShares:
            item.rawAmount ||
            Math.round(usdVal * 1_000_000).toString(),
          shareMintAddress:
            item.mintAddress || addrConfig.collateralOrShareMint,
          programId: addrConfig.programId,
          marketAddress: addrConfig.marketOrVaultAddress,
          currentBaseApy:
            typeof item.supplyApy === 'number'
              ? item.supplyApy
              : typeof item.apy === 'number'
              ? item.apy
              : matched.baseApy,
          currentRewardApy: matched.rewardApy,
          source: 'vybe_api',
          network: cluster,
          lastRefreshedAt: Date.now(),
        });
      }
    }

    // 2. Parse Vybe Wallet Token Balances (/v4/wallets/{ownerAddress}/token-balance)
    // Also detects cTokens / receipt tokens (e.g., Kamino kTokens, Meteora LP, Save cUSDC)
    if (balanceRes.status === 'fulfilled' && balanceRes.value.ok) {
      const payload = await balanceRes.value.json();
      const tokens: VybeTokenBalanceItem[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.tokens)
        ? payload.tokens
        : [];

      for (const t of tokens) {
        const amt = t.uiAmount ?? t.amount ?? 0;
        if (
          t.mintAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
          t.symbol?.toUpperCase() === 'USDC'
        ) {
          usdcWalletBalance = amt;
        }

        // Check if token mint matches any curated market receipt mint
        const matchedMarket = CURATED_MARKETS.find(
          (m) =>
            m.addresses.mainnet.collateralOrShareMint === t.mintAddress ||
            m.addresses.devnet.collateralOrShareMint === t.mintAddress
        );

        if (
          matchedMarket &&
          amt > 0.01 &&
          !positions.some((p) => p.opportunityId === matchedMarket.id)
        ) {
          const addrConfig =
            cluster === 'devnet'
              ? matchedMarket.addresses.devnet
              : matchedMarket.addresses.mainnet;

          positions.push({
            opportunityId: matchedMarket.id,
            protocol: matchedMarket.protocol,
            market: matchedMarket.market,
            depositedUsdc: Number((t.valueUsd ?? amt).toFixed(2)),
            rawShares: Math.round(amt * 1_000_000).toString(),
            shareMintAddress: t.mintAddress,
            programId: addrConfig.programId,
            marketAddress: addrConfig.marketOrVaultAddress,
            currentBaseApy: matchedMarket.baseApy,
            currentRewardApy: matchedMarket.rewardApy,
            source: 'vybe_api',
            network: cluster,
            lastRefreshedAt: Date.now(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Flume Vybe Client] Fallback to RPC reader:', err);
  }

  return {
    positions,
    usdcWalletBalance,
    vybeAuthenticated: true,
  };
}