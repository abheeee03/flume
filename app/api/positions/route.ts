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

    const meteoraLpInfo = await connection.getAccountInfo(userMeteoraLpAta);
    if (meteoraLpInfo?.data && meteoraLpInfo.data.length >= 72) {
      const rawLp = meteoraLpInfo.data.readBigUInt64LE(64);
      const uiLp = Number(rawLp) / 1_000_000;
      const meteoraMarket = CURATED_MARKETS.find(
        (m) => m.id === 'meteora-dynamic-usdc'
      );
      if (uiLp > 0.01 && meteoraMarket) {
        const addr = devnet
          ? meteoraMarket.addresses.devnet
          : meteoraMarket.addresses.mainnet;
        positionsMap.set(meteoraMarket.id, {
          opportunityId: meteoraMarket.id,
          protocol: meteoraMarket.protocol,
          market: meteoraMarket.market,
          depositedUsdc: Number(uiLp.toFixed(2)),
          rawShares: rawLp.toString(),
          shareMintAddress: meteoraLpMint.toBase58(),
          programId: addr.programId,
          marketAddress: addr.marketOrVaultAddress,
          currentBaseApy: meteoraMarket.baseApy,
          currentRewardApy: meteoraMarket.rewardApy,
          source: 'onchain_rpc',
          network: cluster,
          lastRefreshedAt: Date.now(),
        });
      }
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

  const positions = Array.from(positionsMap.values()).sort(
    (a, b) => b.depositedUsdc - a.depositedUsdc
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