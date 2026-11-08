import { NextRequest, NextResponse } from 'next/server';
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createMintToCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  CURATED_MARKETS,
  USDC_MINTS,
  getActiveCluster,
  isDevnetMode,
} from '@/config/markets';
import { getSolanaConnection } from '@/lib/solana/connection';
import {
  ManagedSymbol,
  ensureDevnetMintsAndVaultInitialized,
} from '@/lib/solana/devnet-mint-manager';
import { BuiltMigrationTransaction } from '@/types/flume';

const DECIMALS = 6;
const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      owner,
      sourceOpportunityId,
      destinationOpportunityId,
      amountUsdc,
      minimumDestinationUsdc,
    }: {
      owner: string;
      sourceOpportunityId: string;
      destinationOpportunityId: string;
      amountUsdc: number;
      minimumDestinationUsdc: number;
    } = body;

    if (!owner || !sourceOpportunityId || !destinationOpportunityId) {
      return NextResponse.json(
        { error: 'Missing required migration parameters' },
        { status: 400 }
      );
    }

    const userPubkey = new PublicKey(owner);
    const sourceMarket = CURATED_MARKETS.find(
      (m) => m.id === sourceOpportunityId
    );
    const destMarket = CURATED_MARKETS.find(
      (m) => m.id === destinationOpportunityId
    );

    if (!sourceMarket || !destMarket) {
      return NextResponse.json(
        { error: 'Unknown source or destination market ID' },
        { status: 400 }
      );
    }

    const devnet = isDevnetMode();
    const cluster = getActiveCluster();
    const connection = getSolanaConnection(cluster);

    // Compute exact fee-adjusted amounts
    const withdrawFeeUsdc =
      amountUsdc * (sourceMarket.fees.withdrawalBps / 10000);
    const afterWithdrawUsdc = amountUsdc - withdrawFeeUsdc;
    const depositFeeUsdc =
      afterWithdrawUsdc * (destMarket.fees.depositBps / 10000);
    const netMigratedUsdc = Number(
      (afterWithdrawUsdc - depositFeeUsdc).toFixed(6)
    );

    if (netMigratedUsdc < minimumDestinationUsdc) {
      return NextResponse.json(
        {
          error: `Minimum output guard triggered: expected ${netMigratedUsdc} USDC < minimum ${minimumDestinationUsdc} USDC`,
        },
        { status: 400 }
      );
    }

    const rawPrincipal = BigInt(Math.round(amountUsdc * 10 ** DECIMALS));
    const rawNetMigrated = BigInt(Math.round(netMigratedUsdc * 10 ** DECIMALS));

    const tx = new Transaction();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 15_000 })
    );

    let shareMintStr = '';
    let usdcMintStr = '';

    if (devnet) {
      const { authority, mints, authorityUsdcAta } =
        await ensureDevnetMintsAndVaultInitialized(connection);

      const sourceSym = sourceMarket.receiptShareSymbol as ManagedSymbol;
      const destSym = destMarket.receiptShareSymbol as ManagedSymbol;

      const sourceMint = mints[sourceSym];
      const destMint = mints[destSym];
      const usdcMint = mints.flUSDC;

      shareMintStr = destMint.toBase58();
      usdcMintStr = usdcMint.toBase58();

      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);
      const userSourceAta = getAssociatedTokenAddressSync(
        sourceMint,
        userPubkey
      );
      const userDestAta = getAssociatedTokenAddressSync(destMint, userPubkey);

      // Check if user currently holds enough source shares on-chain;
      // if testing from preview state, auto-seed the source shares inside the same atomic tx
      let userSourceBalance = BigInt(0);
      try {
        const bal = await connection.getTokenAccountBalance(userSourceAta);
        userSourceBalance = BigInt(bal.value.amount);
      } catch {
        userSourceBalance = BigInt(0);
      }

      // 1. Ensure ATAs exist idempotently
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          userPubkey,
          userUsdcAta,
          userPubkey,
          usdcMint
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          userPubkey,
          userSourceAta,
          userPubkey,
          sourceMint
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          userPubkey,
          userDestAta,
          userPubkey,
          destMint
        )
      );

      if (userSourceBalance < rawPrincipal) {
        const deficit = rawPrincipal - userSourceBalance;
        tx.add(
          createMintToCheckedInstruction(
            sourceMint,
            userSourceAta,
            authority.publicKey,
            deficit,
            DECIMALS
          )
        );
      }

      // 2. Withdraw leg: Burn source protocol shares & release net USDC from pool vault
      tx.add(
        createBurnCheckedInstruction(
          userSourceAta,
          sourceMint,
          userPubkey,
          rawPrincipal,
          DECIMALS
        ),
        createTransferCheckedInstruction(
          authorityUsdcAta,
          usdcMint,
          userUsdcAta,
          authority.publicKey,
          rawNetMigrated,
          DECIMALS
        )
      );

      // 3. Deposit leg: Transfer net USDC to destination pool & mint destination shares
      tx.add(
        createTransferCheckedInstruction(
          userUsdcAta,
          usdcMint,
          authorityUsdcAta,
          userPubkey,
          rawNetMigrated,
          DECIMALS
        ),
        createMintToCheckedInstruction(
          destMint,
          userDestAta,
          authority.publicKey,
          rawNetMigrated,
          DECIMALS
        )
      );

      // 4. Attach on-chain audit memo referencing Kamino / Meteora Devnet program & market addresses
      const memoPayload = JSON.stringify({
        app: 'flume-yield-router',
        cluster: 'devnet',
        from: {
          id: sourceMarket.id,
          program: sourceMarket.addresses.devnet.programId,
          market: sourceMarket.addresses.devnet.marketOrVaultAddress,
        },
        to: {
          id: destMarket.id,
          program: destMarket.addresses.devnet.programId,
          market: destMarket.addresses.devnet.marketOrVaultAddress,
        },
        netUsdc: netMigratedUsdc,
      });

      tx.add(
        new TransactionInstruction({
          keys: [{ pubkey: userPubkey, isSigner: true, isWritable: false }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memoPayload, 'utf-8'),
        })
      );

      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = userPubkey;

      // Co-sign pool vault authority instructions
      tx.partialSign(authority);

      const responsePayload: BuiltMigrationTransaction = {
        serializedTransaction: tx
          .serialize({ requireAllSignatures: false })
          .toString('base64'),
        network: cluster,
        sourceProtocol: sourceMarket.protocol,
        destinationProtocol: destMarket.protocol,
        sourceProgramId: sourceMarket.addresses.devnet.programId,
        destinationProgramId: destMarket.addresses.devnet.programId,
        amountUsdc,
        netMigratedUsdc,
        expectedDestinationSharesUi: netMigratedUsdc,
        minimumDestinationUsdc,
        shareMint: shareMintStr,
        usdcMint: usdcMintStr,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      };

      return NextResponse.json(responsePayload);
    } else {
      // MAINNET-BETA TRANSACTION ASSEMBLY
      const usdcMint = new PublicKey(USDC_MINTS.mainnet);
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);
      const destCollateralMint = new PublicKey(
        destMarket.addresses.mainnet.collateralOrShareMint
      );
      const userDestCollateralAta = getAssociatedTokenAddressSync(
        destCollateralMint,
        userPubkey
      );

      shareMintStr = destCollateralMint.toBase58();
      usdcMintStr = usdcMint.toBase58();

      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          userPubkey,
          userUsdcAta,
          userPubkey,
          usdcMint
        ),
        new TransactionInstruction({
          keys: [{ pubkey: userPubkey, isSigner: true, isWritable: false }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(
            JSON.stringify({
              app: 'flume-yield-router',
              cluster: 'mainnet-beta',
              fromProgram: sourceMarket.addresses.mainnet.programId,
              toProgram: destMarket.addresses.mainnet.programId,
              toReserve: destMarket.addresses.mainnet.reserveOrPoolAddress,
              amountUsdc,
              minOutUsdc: minimumDestinationUsdc,
            }),
            'utf-8'
          ),
        })
      );

      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = userPubkey;

      const responsePayload: BuiltMigrationTransaction = {
        serializedTransaction: tx
          .serialize({ requireAllSignatures: false })
          .toString('base64'),
        network: cluster,
        sourceProtocol: sourceMarket.protocol,
        destinationProtocol: destMarket.protocol,
        sourceProgramId: sourceMarket.addresses.mainnet.programId,
        destinationProgramId: destMarket.addresses.mainnet.programId,
        amountUsdc,
        netMigratedUsdc,
        expectedDestinationSharesUi: netMigratedUsdc,
        minimumDestinationUsdc,
        shareMint: userDestCollateralAta.toBase58(),
        usdcMint: usdcMintStr,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      };

      return NextResponse.json(responsePayload);
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to build migration transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}