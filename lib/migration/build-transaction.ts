import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { CURATED_MARKETS, getActiveCluster, isDevnetMode } from '@/config/markets';
import { buildRealUsdcProtocolMigrationInstructions } from '@/lib/solana/protocol-instructions';
import { BuiltMigrationTransaction } from '@/types/flume';

export async function buildAtomicMigrationTransaction(params: {
  connection: Connection;
  owner: string;
  sourceOpportunityId: string;
  destinationOpportunityId: string;
  amountUsdc: number;
  minimumDestinationUsdc: number;
}): Promise<BuiltMigrationTransaction> {
  const {
    connection,
    owner,
    sourceOpportunityId,
    destinationOpportunityId,
    amountUsdc,
    minimumDestinationUsdc,
  } = params;

  const userPubkey = new PublicKey(owner);
  const sourceMarket = CURATED_MARKETS.find((m) => m.id === sourceOpportunityId);
  const destMarket = CURATED_MARKETS.find(
    (m) => m.id === destinationOpportunityId
  );

  if (!sourceMarket || !destMarket) {
    throw new Error('Unknown source or destination market ID');
  }

  const devnet = isDevnetMode();
  const cluster = getActiveCluster();

  const withdrawFeeUsdc =
    amountUsdc * (sourceMarket.fees.withdrawalBps / 10000);
  const afterWithdrawUsdc = amountUsdc - withdrawFeeUsdc;
  const depositFeeUsdc =
    afterWithdrawUsdc * (destMarket.fees.depositBps / 10000);
  const netMigratedUsdc = Number(
    (afterWithdrawUsdc - depositFeeUsdc).toFixed(6)
  );

  if (netMigratedUsdc < minimumDestinationUsdc) {
    throw new Error(
      `Minimum output guard triggered: expected ${netMigratedUsdc} USDC < minimum ${minimumDestinationUsdc} USDC`
    );
  }

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
    minimumDestinationUsdc,
  });

  tx.add(...instructions);

  const latest = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = userPubkey;

  const sourceAddr = devnet
    ? sourceMarket.addresses.devnet
    : sourceMarket.addresses.mainnet;
  const destAddr = devnet
    ? destMarket.addresses.devnet
    : destMarket.addresses.mainnet;

  return {
    serializedTransaction: tx
      .serialize({ requireAllSignatures: false })
      .toString('base64'),
    network: cluster,
    sourceProtocol: sourceMarket.protocol,
    destinationProtocol: destMarket.protocol,
    sourceProgramId: sourceAddr.programId,
    destinationProgramId: destAddr.programId,
    amountUsdc,
    netMigratedUsdc,
    expectedDestinationUsdc: netMigratedUsdc,
    expectedDestinationSharesUi: netMigratedUsdc,
    minimumDestinationUsdc,
    shareMint: destVaultOrReserveAddress,
    usdcMint: usdcMint.toBase58(),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    instructionsSummary,
  };
}