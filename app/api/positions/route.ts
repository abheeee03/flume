import { NextRequest, NextResponse } from 'next/server';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  CURATED_MARKETS,
  getActiveCluster,
  getActiveUsdcMint,
  isDevnetMode,
} from '@/config/markets';
import { getSolanaConnection } from '@/lib/solana/connection';
import { deriveMeteoraDynamicVaultAddresses } from '@/lib/solana/protocol-instructions';
import { fetchVybeUserPositions } from '@/lib/vybe/client';
import { UserPosition } from '@/types/flume';

interface RecordedMigration {
  wallet: string;
  fromId: string;
  toId: string;
  amountUsdc: number;
  netUsdc: number;
  signature?: string;
  timestamp: number;
}

// In-memory cache for fast UI updates before RPC indexers catch up
const recentMigrationsStore = new Map<string, RecordedMigration[]>();

function recordMigrationInMemory(record: RecordedMigration) {
  const existing = recentMigrationsStore.get(record.wallet) ?? [];
  // Keep last 20 migrations for this wallet
  const updated = [record, ...existing.filter((m) => m.signature !== record.signature)].slice(0, 20);
  recentMigrationsStore.set(record.wallet, updated);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, fromId, toId, amountUsdc, netUsdc, signature } = body;

    if (!wallet || !toId) {
      return NextResponse.json({ error: 'Missing required migration fields' }, { status: 400 });
    }

    recordMigrationInMemory({
      wallet,
      fromId: fromId ?? 'wallet-usdc',
      toId,
      amountUsdc: Number(amountUsdc) || 0,
      netUsdc: Number(netUsdc) || Number(amountUsdc) || 0,
      signature: signature ?? undefined,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record migration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const devnet = isDevnetMode();
  const cluster = getActiveCluster();
  const activeUsdcMintStr = getActiveUsdcMint();

  if (!wallet) {
    return NextResponse.json(
      { error: 'Missing wallet query parameter' },
      { status: 400 }
    );
  }

  let ownerPubkey: PublicKey;
  try {
    ownerPubkey = new PublicKey(wallet);
  } catch {
    return NextResponse.json(
      { error: 'Invalid Solana wallet address' },
      { status: 400 }
    );
  }

  const connection = await getSolanaConnection(cluster);

  // Vybe indexes mainnet. On devnet it would report another cluster's Save
  // deposits as if they were this wallet's devnet USDC position.
  const vybeData = devnet
    ? { positions: [], usdcWalletBalance: null, vybeAuthenticated: false }
    : await fetchVybeUserPositions(ownerPubkey.toBase58());
  const positionsMap = new Map<string, UserPosition>();

  for (const pos of vybeData.positions) {
    if (pos.shareMintAddress === activeUsdcMintStr) continue;
    positionsMap.set(pos.opportunityId, pos);
  }

  let solBalance = 0;
  let usdcBalance = devnet ? 0 : (vybeData.usdcWalletBalance ?? 0);
  let balancesAvailable = false;
  let balanceError: string | null = null;

  try {
    const usdcMintPk = new PublicKey(activeUsdcMintStr);
    const userUsdcAta = getAssociatedTokenAddressSync(usdcMintPk, ownerPubkey);

    const { lpMintPda: meteoraLpMint } =
      deriveMeteoraDynamicVaultAddresses(usdcMintPk);
    const userMeteoraLpAta = getAssociatedTokenAddressSync(
      meteoraLpMint,
      ownerPubkey
    );

    const [lamports, tokenAccounts] = await Promise.all([
      connection.getBalance(ownerPubkey),
      connection.getParsedTokenAccountsByOwner(ownerPubkey, {
        mint: usdcMintPk,
      }),
    ]);

    solBalance = lamports / LAMPORTS_PER_SOL;
    balancesAvailable = true;

    const parsedUsdc = tokenAccounts.value.reduce((acc, item) => {
      const info = item.account.data.parsed?.info;
      if (info?.mint !== activeUsdcMintStr) return acc;
      const ui = info?.tokenAmount?.uiAmount ?? 0;
      return acc + ui;
    }, 0);

    if (tokenAccounts.value.length > 0) {
      usdcBalance = parsedUsdc;
    } else {
      const ataInfo = await connection.getAccountInfo(userUsdcAta);
      if (ataInfo?.data && ataInfo.data.length >= 72) {
        const rawUsdc = ataInfo.data.readBigUInt64LE(64);
        usdcBalance = Number(rawUsdc) / 1_000_000;
      } else {
        usdcBalance = 0;
      }
    }

    // Check Meteora LP account info on-chain
    let hasMeteoraLpTokens = false;
    let meteoraLpUi = 0;
    let meteoraRawLp = BigInt(0);
    const meteoraLpInfo = await connection.getAccountInfo(userMeteoraLpAta);
    if (meteoraLpInfo?.data && meteoraLpInfo.data.length >= 72) {
      meteoraRawLp = meteoraLpInfo.data.readBigUInt64LE(64);
      meteoraLpUi = Number(meteoraRawLp) / 1_000_000;
      if (meteoraLpUi > 0.01) {
        hasMeteoraLpTokens = true;
      }
    }

    // 1. Fetch on-chain signatures and scan for Flume atomic migration memos
    const sigs = await connection.getSignaturesForAddress(ownerPubkey, { limit: 25 });
    const onChainFlumeMemos: Array<{
      signature: string;
      blockTime: number;
      fromId: string;
      toId: string;
      amountUsdc: number;
      netUsdc: number;
    }> = [];

    for (const s of sigs) {
      if (s.memo && s.err === null) {
        const jsonStart = s.memo.indexOf('{');
        if (jsonStart !== -1) {
          try {
            const parsed = JSON.parse(s.memo.slice(jsonStart));
            if (parsed.protocol === 'flume-v2' && parsed.to?.id) {
              onChainFlumeMemos.push({
                signature: s.signature,
                blockTime: s.blockTime ?? Math.floor(Date.now() / 1000),
                fromId: parsed.from?.id ?? 'wallet-usdc',
                toId: parsed.to.id,
                amountUsdc: Number(parsed.amountUsdc) || 0,
                netUsdc: Number(parsed.netUsdc) || Number(parsed.amountUsdc) || 0,
              });
            }
          } catch {
            // Ignore non-JSON or unrelated memos
          }
        }
      }
    }

    // Merge in-memory recently confirmed migrations (for immediate UI response before RPC indexers update)
    const inMemList = recentMigrationsStore.get(ownerPubkey.toBase58()) ?? [];
    const now = Date.now();
    const validInMem = inMemList.filter((m) => now - m.timestamp < 15 * 60 * 1000); // 15 mins

    // Deduplicate: remove in-memory items that already appear in onChainFlumeMemos
    const seenSigs = new Set(onChainFlumeMemos.map((m) => m.signature));
    const allFlumeMigrations = [
      ...onChainFlumeMemos,
      ...validInMem
        .filter((m) => !m.signature || !seenSigs.has(m.signature))
        .map((m) => ({
          signature: m.signature ?? 'in-memory-recent',
          blockTime: Math.floor(m.timestamp / 1000),
          fromId: m.fromId,
          toId: m.toId,
          amountUsdc: m.amountUsdc,
          netUsdc: m.netUsdc,
        })),
    ];

    // Sort chronologically (oldest to newest) to replay user position transitions
    allFlumeMigrations.sort((a, b) => a.blockTime - b.blockTime);

    // Track active protocol positions based on migrations
    const flumeBalances = new Map<string, { depositedUsdc: number; lastRefreshedAt: number }>();

    // Initial state: if user had Meteora LP tokens before migrations
    if (hasMeteoraLpTokens) {
      flumeBalances.set('meteora-dynamic-usdc', {
        depositedUsdc: Number(meteoraLpUi.toFixed(2)),
        lastRefreshedAt: Date.now() - 3600_000,
      });
    }

    for (const m of allFlumeMigrations) {
      // 1. Deduct or clear from source protocol
      if (m.fromId && m.fromId !== 'wallet-usdc') {
        const currentSource = flumeBalances.get(m.fromId);
        if (currentSource) {
          const rem = currentSource.depositedUsdc - m.amountUsdc;
          if (rem > 0.01) {
            flumeBalances.set(m.fromId, {
              depositedUsdc: Number(rem.toFixed(2)),
              lastRefreshedAt: m.blockTime * 1000,
            });
          } else {
            flumeBalances.delete(m.fromId);
          }
        } else {
          flumeBalances.delete(m.fromId);
        }
      }

      // 2. Add or set destination protocol
      if (m.toId) {
        const currentDest = flumeBalances.get(m.toId);
        const newBal = (currentDest?.depositedUsdc ?? 0) + m.netUsdc;
        flumeBalances.set(m.toId, {
          depositedUsdc: Number(newBal.toFixed(2)),
          lastRefreshedAt: m.blockTime * 1000,
        });
      }
    }

    // Materialize Flume protocol positions into positionsMap
    for (const [marketId, bal] of flumeBalances.entries()) {
      if (bal.depositedUsdc <= 0.01) continue;
      const targetMarket = CURATED_MARKETS.find((cm) => cm.id === marketId);
      if (!targetMarket) continue;

      const addr = devnet
        ? targetMarket.addresses.devnet
        : targetMarket.addresses.mainnet;

      positionsMap.set(marketId, {
        opportunityId: targetMarket.id,
        protocol: targetMarket.protocol,
        market: targetMarket.market,
        depositedUsdc: bal.depositedUsdc,
        rawShares: Math.round(bal.depositedUsdc * 1_000_000).toString(),
        shareMintAddress: addr.collateralOrShareMint,
        programId: addr.programId,
        marketAddress: addr.marketOrVaultAddress,
        currentBaseApy: targetMarket.baseApy,
        currentRewardApy: targetMarket.rewardApy,
        source: 'onchain_rpc',
        network: cluster,
        lastRefreshedAt: bal.lastRefreshedAt,
      });
    }
  } catch (err) {
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : null;
    balanceError =
      err instanceof Error
        ? cause
          ? `${err.message} (${cause})`
          : err.message
        : 'Devnet RPC balance read failed';
    console.warn('[Flume /api/positions] On-chain balance check warning:', balanceError);
  }

  // Sort positions by newest refreshed first, then by deposited USDC
  const positions = Array.from(positionsMap.values()).sort(
    (a, b) => (b.lastRefreshedAt || 0) - (a.lastRefreshedAt || 0) || b.depositedUsdc - a.depositedUsdc
  );

  return NextResponse.json({
    wallet: ownerPubkey.toBase58(),
    cluster,
    devnet,
    usdcMint: activeUsdcMintStr,
    vybeConnected: vybeData.vybeAuthenticated,
    solWalletBalance: Number(solBalance.toFixed(4)),
    usdcWalletBalance: Number(usdcBalance.toFixed(2)),
    balancesAvailable,
    balanceError,
    positions,
    updatedAt: Date.now(),
  });
}
