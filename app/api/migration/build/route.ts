import { NextRequest, NextResponse } from 'next/server';
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  CURATED_MARKETS,
  getActiveCluster,
  isDevnetMode,
} from '@/config/markets';
import { getSolanaConnection } from '@/lib/solana/connection';
import { buildRealUsdcProtocolMigrationInstructions } from '@/lib/solana/protocol-instructions';
import { BuiltMigrationTransaction } from '@/types/flume';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      owner,
      sourceOpportunityId,
      destinationOpportunityId,
      amountUsdc,
      minimumDestinationUsdc,
      acknowledgeSlippage,
    }: {
      owner: string;
      sourceOpportunityId: string;
      destinationOpportunityId: string;
      amountUsdc: number;
      minimumDestinationUsdc?: number;
      acknowledgeSlippage?: boolean;
    } = body;

    if (!owner || !sourceOpportunityId || !destinationOpportunityId) {
      return NextResponse.json(
        { error: 'Missing required migration parameters' },
        { status: 400 }
      );
    }

    const userPubkey = new PublicKey(owner);
    const sourceIsWallet = sourceOpportunityId === 'wallet-usdc';
    const foundSource =
      CURATED_MARKETS.find((m) => m.id === sourceOpportunityId) ?? null;
    const sourceMarket = sourceIsWallet ? null : foundSource;
    const destMarket =
      CURATED_MARKETS.find((m) => m.id === destinationOpportunityId) ?? null;

    if ((!sourceIsWallet && !sourceMarket) || !destMarket) {
      return NextResponse.json(
        { error: 'Unknown source or destination market ID' },
        { status: 400 }
      );
    }

    const devnet = isDevnetMode();
    const cluster = getActiveCluster();
    const connection = await getSolanaConnection(cluster);

    const withdrawFeeUsdc = sourceMarket
      ? amountUsdc * (sourceMarket.fees.withdrawalBps / 10000)
      : 0;
    const afterWithdrawUsdc = amountUsdc - withdrawFeeUsdc;
    const depositFeeUsdc =
      afterWithdrawUsdc * (destMarket.fees.depositBps / 10000);
    const netMigratedUsdc = Number(
      (afterWithdrawUsdc - depositFeeUsdc).toFixed(6)
    );

    const minRequired = minimumDestinationUsdc ?? Number((netMigratedUsdc * 0.9995).toFixed(6));

    if (netMigratedUsdc < minRequired && !acknowledgeSlippage) {
      return NextResponse.json(
        {
          error: `Minimum output guard triggered: expected ${netMigratedUsdc} USDC < minimum ${minRequired} USDC`,
          code: 'MINIMUM_OUTPUT_GUARD',
          expectedUsdc: netMigratedUsdc,
          minimumUsdc: minRequired,
          sourceWithdrawFeeUsdc: Number(withdrawFeeUsdc.toFixed(6)),
          destDepositFeeUsdc: Number(depositFeeUsdc.toFixed(6)),
        },
        { status: 400 }
      );
    }

    const effectiveMinDestUsdc =
      acknowledgeSlippage || netMigratedUsdc < minRequired
        ? Number((netMigratedUsdc * 0.9995).toFixed(6))
        : minRequired;

    const tx = new Transaction();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
    );

    const {
      instructions,
      usdcMint,
      destVaultOrReserveAddress,
      instructionsSummary,
    } = await buildRealUsdcProtocolMigrationInstructions({
      connection,
      userPubkey,
      sourceMarket,
      destMarket,
      amountUsdc,
      netMigratedUsdc,
      minimumDestinationUsdc: effectiveMinDestUsdc,
    });

    tx.add(...instructions);

    const latest = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = userPubkey;

    const sourceAddr = sourceMarket
      ? devnet
        ? sourceMarket.addresses.devnet
        : sourceMarket.addresses.mainnet
      : null;
    const destAddr = devnet
      ? destMarket.addresses.devnet
      : destMarket.addresses.mainnet;

    const responsePayload: BuiltMigrationTransaction = {
      serializedTransaction: tx
        .serialize({ requireAllSignatures: false })
        .toString('base64'),
      network: cluster,
      sourceProtocol: sourceMarket?.protocol ?? 'Wallet USDC',
      destinationProtocol: destMarket.protocol,
      sourceProgramId: sourceAddr?.programId ?? 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      destinationProgramId: destAddr.programId,
      amountUsdc,
      netMigratedUsdc,
      expectedDestinationUsdc: netMigratedUsdc,
      expectedDestinationSharesUi: netMigratedUsdc,
      minimumDestinationUsdc: effectiveMinDestUsdc,
      shareMint: destVaultOrReserveAddress,
      usdcMint: usdcMint.toBase58(),
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      instructionsSummary,
    };

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to build migration transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}