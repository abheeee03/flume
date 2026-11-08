import crypto from 'crypto';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import { getSolanaConnection } from './connection';

export type ManagedSymbol =
  | 'flUSDC'
  | 'flKMNO'
  | 'flMET'
  | 'flSAVE'
  | 'flMRGN'
  | 'flLOOP'
  | 'flDRFT';

export const SHARE_SYMBOLS: ManagedSymbol[] = [
  'flUSDC',
  'flKMNO',
  'flMET',
  'flSAVE',
  'flMRGN',
  'flLOOP',
  'flDRFT',
];

const DECIMALS = 6;

function deriveDeterministicKeypair(seedLabel: string): Keypair {
  const secretEnv = process.env.FLUME_DEVNET_SECRET_KEY?.trim();
  let rootSeed: Buffer;

  if (secretEnv) {
    try {
      const parsed = JSON.parse(secretEnv) as number[];
      if (Array.isArray(parsed) && parsed.length >= 32) {
        const baseKp = Keypair.fromSecretKey(Uint8Array.from(parsed));
        if (seedLabel === 'authority') return baseKp;
        rootSeed = Buffer.from(baseKp.secretKey.slice(0, 32));
      } else {
        rootSeed = crypto.createHash('sha256').update(secretEnv).digest();
      }
    } catch {
      rootSeed = crypto.createHash('sha256').update(secretEnv).digest();
    }
  } else {
    rootSeed = crypto
      .createHash('sha256')
      .update('flume-devnet-demo-authority-v1')
      .digest();
  }

  const childSeed = crypto
    .createHash('sha256')
    .update(Buffer.concat([rootSeed, Buffer.from(`:${seedLabel}`)]))
    .digest();

  return Keypair.fromSeed(childSeed);
}

export function getDevnetAuthorityKeypair(): Keypair {
  return deriveDeterministicKeypair('authority');
}

export function getDeterministicMintKeypair(symbol: ManagedSymbol): Keypair {
  return deriveDeterministicKeypair(`mint:${symbol}:v2`);
}

export function getDeterministicMintAddresses(): Record<ManagedSymbol, string> {
  const result = {} as Record<ManagedSymbol, string>;
  for (const sym of SHARE_SYMBOLS) {
    result[sym] = getDeterministicMintKeypair(sym).publicKey.toBase58();
  }
  return result;
}

let isInitialized = false;

export async function ensureDevnetMintsAndVaultInitialized(
  connection: Connection = getSolanaConnection('devnet')
): Promise<{
  authority: Keypair;
  mints: Record<ManagedSymbol, PublicKey>;
  authorityUsdcAta: PublicKey;
}> {
  const authority = getDevnetAuthorityKeypair();
  const mints = {} as Record<ManagedSymbol, PublicKey>;

  for (const sym of SHARE_SYMBOLS) {
    mints[sym] = getDeterministicMintKeypair(sym).publicKey;
  }

  const authorityUsdcAta = getAssociatedTokenAddressSync(
    mints.flUSDC,
    authority.publicKey
  );

  if (isInitialized) {
    return { authority, mints, authorityUsdcAta };
  }

  // 1. Check authority SOL balance on Devnet and airdrop if low
  const solBalance = await connection.getBalance(authority.publicKey);
  if (solBalance < 0.05 * LAMPORTS_PER_SOL) {
    try {
      const sig = await connection.requestAirdrop(
        authority.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: sig,
        ...latest,
      });
    } catch (err) {
      console.warn(
        '[Flume Devnet] Auto-airdrop rate-limited; ensure authority has Devnet SOL:',
        authority.publicKey.toBase58(),
        err
      );
    }
  }

  // 2. Check which mints do not exist on-chain yet
  const mintPubkeys = SHARE_SYMBOLS.map((s) => mints[s]);
  const accountInfos = await connection.getMultipleAccountsInfo(mintPubkeys);
  const missingSymbols = SHARE_SYMBOLS.filter((_, idx) => !accountInfos[idx]);

  if (missingSymbols.length > 0) {
    const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection);

    // Batch in groups of 3 to stay comfortably within Solana tx size limits
    for (let i = 0; i < missingSymbols.length; i += 3) {
      const batch = missingSymbols.slice(i, i + 3);
      const tx = new Transaction();
      const signers: Keypair[] = [authority];

      for (const sym of batch) {
        const mintKp = getDeterministicMintKeypair(sym);
        signers.push(mintKp);
        tx.add(
          SystemProgram.createAccount({
            fromPubkey: authority.publicKey,
            newAccountPubkey: mintKp.publicKey,
            space: MINT_SIZE,
            lamports: lamportsForMint,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMint2Instruction(
            mintKp.publicKey,
            DECIMALS,
            authority.publicKey,
            authority.publicKey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      await sendAndConfirmTransaction(connection, tx, signers, {
        commitment: 'confirmed',
      });
    }
  }

  // 3. Ensure Authority Vault holds sufficient Devnet flUSDC liquidity for pool payouts
  try {
    const vaultAtaInfo = await connection.getTokenAccountBalance(authorityUsdcAta);
    const uiAmount = vaultAtaInfo.value.uiAmount ?? 0;
    if (uiAmount < 1_000_000) {
      const seedTx = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          authority.publicKey,
          authorityUsdcAta,
          authority.publicKey,
          mints.flUSDC
        ),
        createMintToCheckedInstruction(
          mints.flUSDC,
          authorityUsdcAta,
          authority.publicKey,
          BigInt(10_000_000) * BigInt(10 ** DECIMALS),
          DECIMALS
        )
      );
      await sendAndConfirmTransaction(connection, seedTx, [authority], {
        commitment: 'confirmed',
      });
    }
  } catch {
    const initVaultTx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        authorityUsdcAta,
        authority.publicKey,
        mints.flUSDC
      ),
      createMintToCheckedInstruction(
        mints.flUSDC,
        authorityUsdcAta,
        authority.publicKey,
        BigInt(10_000_000) * BigInt(10 ** DECIMALS),
        DECIMALS
      )
    );
    await sendAndConfirmTransaction(connection, initVaultTx, [authority], {
      commitment: 'confirmed',
    });
  }

  isInitialized = true;
  return { authority, mints, authorityUsdcAta };
}