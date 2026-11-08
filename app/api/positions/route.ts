import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  CURATED_MARKETS,
  USDC_MINTS,
  getActiveCluster,
  isDevnetMode,
} from '@/config/markets';
import { getSolanaConnection } from '@/lib/solana/connection';
import {
  ManagedSymbol,
  getDeterministicMintAddresses,
} from '@/lib/solana/devnet-mint-manager';
import { fetchVybeUserPositions } from '@/lib/vybe/client';
import { UserPosition } from '@/types/flume';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const devnet = isDevnetMode();
  const cluster = getActiveCluster();

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

  // 1. Query Vybe Network API for yield-invested protocol positions & balances
  const vybeData = await fetchVybeUserPositions(ownerPubkey.toBase58());
  const positionsMap = new Map<string, UserPosition>();

  for (const pos of vybeData.positions) {
    positionsMap.set(pos.opportunityId, pos);
  }

  // 2. Query On-Chain SPL Receipt / Collateral Token Accounts (Devnet or Mainnet)
  const connection = getSolanaConnection(cluster);
  const devnetMints = getDeterministicMintAddresses();
  let usdcBalance = vybeData.usdcWalletBalance ?? 0;

  try {
    const usdcMintStr = devnet ? devnetMints.flUSDC : USDC_MINTS.mainnet;
    const usdcMintPk = new PublicKey(usdcMintStr);
    const userUsdcAta = getAssociatedTokenAddressSync(usdcMintPk, ownerPubkey);

    const marketMintChecks = CURATED_MARKETS.map((market) => {
      const sym = market.receiptShareSymbol as ManagedSymbol;
      const mintStr = devnet
        ? devnetMints[sym]
        : market.addresses.mainnet.collateralOrShareMint;
      const mintPk = new PublicKey(mintStr);
      const ata = getAssociatedTokenAddressSync(mintPk, ownerPubkey);
      return { market, mintStr, ata };
    });

    const allAtas = [userUsdcAta, ...marketMintChecks.map((m) => m.ata)];
    const infos = await connection.getMultipleAccountsInfo(allAtas);

    // Parse USDC balance if available on-chain
    if (infos[0]?.data && infos[0].data.length >= 72) {
      const rawUsdc = infos[0].data.readBigUInt64LE(64);
      usdcBalance = Number(rawUsdc) / 1_000_000;
    }

    // Parse protocol receipt share balances
    for (let i = 0; i < marketMintChecks.length; i++) {
      const acct = infos[i + 1];
      if (!acct?.data || acct.data.length < 72) continue;

      const rawAmount = acct.data.readBigUInt64LE(64);
      const uiAmount = Number(rawAmount) / 1_000_000;

      if (uiAmount > 0.01) {
        const { market, mintStr } = marketMintChecks[i];
        const addr = devnet
          ? market.addresses.devnet
          : market.addresses.mainnet;

        positionsMap.set(market.id, {
          opportunityId: market.id,
          protocol: market.protocol,
          market: market.market,
          depositedUsdc: Number(uiAmount.toFixed(2)),
          rawShares: rawAmount.toString(),
          shareMintAddress: mintStr,
          programId: addr.programId,
          marketAddress: addr.marketOrVaultAddress,
          currentBaseApy: market.baseApy,
          currentRewardApy: market.rewardApy,
          source: positionsMap.has(market.id) ? 'hybrid' : 'onchain_rpc',
          network: cluster,
          lastRefreshedAt: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn('[Flume /api/positions] On-chain scan warning:', err);
  }

  const positions = Array.from(positionsMap.values()).sort(
    (a, b) => b.depositedUsdc - a.depositedUsdc
  );

  return NextResponse.json({
    wallet: ownerPubkey.toBase58(),
    cluster,
    devnet,
    vybeConnected: vybeData.vybeAuthenticated,
    usdcWalletBalance: Number(usdcBalance.toFixed(2)),
    positions,
    updatedAt: Date.now(),
  });
}