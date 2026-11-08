import { NextRequest, NextResponse } from 'next/server';
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { isDevnetMode } from '@/config/markets';
import { getSolanaConnection } from '@/lib/solana/connection';
import {
  ManagedSymbol,
  ensureDevnetMintsAndVaultInitialized,
} from '@/lib/solana/devnet-mint-manager';

const DECIMALS = 6;

export async function POST(req: NextRequest) {
  if (!isDevnetMode()) {
    return NextResponse.json(
      {
        error:
          'Faucet is disabled when DEVNET=false (Mainnet mode). Switch DEVNET=true in .env to mint Devnet tokens.',
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      walletAddress,
      action = 'seed_save_position',
    }: {
      walletAddress?: string;
      action?: 'mint_usdc' | 'seed_save_position' | 'seed_kamino_position';
    } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    const userPubkey = new PublicKey(walletAddress);
    const connection = getSolanaConnection('devnet');
    const { authority, mints } =
      await ensureDevnetMintsAndVaultInitialized(connection);

    let targetSymbol: ManagedSymbol = 'flSAVE';
    let uiAmount = 5000;

    if (action === 'mint_usdc') {
      targetSymbol = 'flUSDC';
      uiAmount = 10000;
    } else if (action === 'seed_kamino_position') {
      targetSymbol = 'flKMNO';
      uiAmount = 5000;
    }

    const targetMint = mints[targetSymbol];
    const userAta = getAssociatedTokenAddressSync(targetMint, userPubkey);
    const rawAmount = BigInt(uiAmount) * BigInt(10 ** DECIMALS);

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        userAta,
        userPubkey,
        targetMint
      ),
      createMintToCheckedInstruction(
        targetMint,
        userAta,
        authority.publicKey,
        rawAmount,
        DECIMALS
      )
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [authority],
      { commitment: 'confirmed' }
    );

    return NextResponse.json({
      success: true,
      signature,
      action,
      symbol: targetSymbol,
      amountUi: uiAmount,
      mintAddress: targetMint.toBase58(),
      userAta: userAta.toBase58(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to execute Devnet faucet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}