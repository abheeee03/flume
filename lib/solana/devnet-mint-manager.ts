import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { MARKETS, USDC_DECIMALS } from "@/config/markets";
import { getConnection } from "@/lib/solana/connection";
import {
  DEMO_AUTHORITY_SEED,
  DEMO_USDC_SYMBOL,
  demoKeypair,
} from "@/lib/solana/demo-mints";
import { toBaseUnits } from "@/lib/solana/units";

const POOL_LIQUIDITY_UI = 1_000_000;

export interface DevnetMints {
  authority: Keypair;
  usdcMint: PublicKey;
  poolUsdcAccount: PublicKey;
  shareMints: Record<string, PublicKey>;
}

export function loadAuthority(): Keypair {
  const raw = process.env.FLUME_DEVNET_SECRET_KEY?.trim();
  if (!raw) return demoKeypair(DEMO_AUTHORITY_SEED);

  if (raw.startsWith("[")) {
    const bytes = Uint8Array.from(JSON.parse(raw) as number[]);
    return Keypair.fromSecretKey(bytes);
  }

  return Keypair.fromSecretKey(bs58.decode(raw));
}

async function ensureSol(authority: Keypair): Promise<void> {
  const connection = getConnection();
  const balance = await connection.getBalance(authority.publicKey);
  if (balance >= 0.2 * LAMPORTS_PER_SOL) return;

  const signature = await connection.requestAirdrop(
    authority.publicKey,
    LAMPORTS_PER_SOL,
  );
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );

  const funded = await connection.getBalance(authority.publicKey);
  if (funded < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error("Devnet authority has too little SOL to create demo mints.");
  }
}

async function ensureMint(authority: Keypair, symbol: string): Promise<PublicKey> {
  const connection = getConnection();
  const mintKeypair = demoKeypair(`${DEMO_AUTHORITY_SEED}:${symbol}`);
  const existing = await connection.getAccountInfo(mintKeypair.publicKey);
  if (!existing) {
    await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      USDC_DECIMALS,
      mintKeypair,
    );
    return mintKeypair.publicKey;
  }

  await getMint(connection, mintKeypair.publicKey);
  return mintKeypair.publicKey;
}

async function ensurePoolLiquidity(
  authority: Keypair,
  usdcMint: PublicKey,
): Promise<PublicKey> {
  const connection = getConnection();
  const poolUsdcAccount = getAssociatedTokenAddressSync(
    usdcMint,
    authority.publicKey,
    false,
    TOKEN_PROGRAM_ID,
  );
  const accountInfo = await connection.getAccountInfo(poolUsdcAccount);
  let amount = 0n;
  if (!accountInfo) {
    const created = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      usdcMint,
      authority.publicKey,
    );
    amount = created.amount;
  } else {
    amount = (await getAccount(connection, poolUsdcAccount)).amount;
  }

  const target = toBaseUnits(POOL_LIQUIDITY_UI);
  if (amount < target) {
    await mintToChecked(
      connection,
      authority,
      usdcMint,
      poolUsdcAccount,
      authority,
      target - amount,
      USDC_DECIMALS,
    );
  }

  return poolUsdcAccount;
}

let inflight: Promise<DevnetMints> | null = null;

export function getDevnetMints(): Promise<DevnetMints> {
  if (!inflight) {
    inflight = prepareDevnetMints().catch((error: unknown) => {
      inflight = null;
      throw error;
    });
  }
  return inflight;
}

async function prepareDevnetMints(): Promise<DevnetMints> {
  const authority = loadAuthority();
  await ensureSol(authority);
  const usdcMint = await ensureMint(authority, DEMO_USDC_SYMBOL);
  const poolUsdcAccount = await ensurePoolLiquidity(authority, usdcMint);
  const shareMints: Record<string, PublicKey> = {};

  for (const market of MARKETS) {
    shareMints[market.id] = await ensureMint(authority, market.receiptShareSymbol);
  }

  return { authority, usdcMint, poolUsdcAccount, shareMints };
}

export async function mintDemoTokens(input: {
  wallet: PublicKey;
  mint: PublicKey;
  amountUi: number;
}): Promise<{ signature: string; ata: PublicKey }> {
  const connection = getConnection();
  const { authority } = await getDevnetMints();
  const account = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    input.mint,
    input.wallet,
  );

  const signature = await mintToChecked(
    connection,
    authority,
    input.mint,
    account.address,
    authority,
    toBaseUnits(input.amountUi),
    USDC_DECIMALS,
  );

  await fundWalletIfNeeded(authority, input.wallet);
  return { signature, ata: account.address };
}

async function fundWalletIfNeeded(authority: Keypair, wallet: PublicKey): Promise<void> {
  const connection = getConnection();
  const balance = await connection.getBalance(wallet);
  if (balance >= 0.02 * LAMPORTS_PER_SOL) return;

  const authorityBalance = await connection.getBalance(authority.publicKey);
  if (authorityBalance < 0.08 * LAMPORTS_PER_SOL) return;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: wallet,
      lamports: Math.floor(0.05 * LAMPORTS_PER_SOL),
    }),
  );
  transaction.feePayer = authority.publicKey;
  const latest = await connection.getLatestBlockhash();
  transaction.recentBlockhash = latest.blockhash;
  transaction.sign(authority);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
}
