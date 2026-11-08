import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createMintToCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { USDC_DECIMALS } from "@/config/markets";
import { settlementAmounts } from "@/lib/yield-engine/calculator";
import { opportunityById } from "@/lib/yield-engine/opportunities";
import { getConnection } from "@/lib/solana/connection";
import { getDevnetMints } from "@/lib/solana/devnet-mint-manager";
import { toBaseUnits } from "@/lib/solana/units";
import type { MigrationBuildRequest, MigrationBuildResponse, YieldOpportunity } from "@/types/flume";

export async function buildMigrationTransaction(
  input: MigrationBuildRequest,
  opportunities: YieldOpportunity[],
): Promise<MigrationBuildResponse> {
  if (input.sourceOpportunityId === input.destinationOpportunityId) {
    throw new Error("Source and destination are the same market.");
  }

  const source = opportunityById(opportunities, input.sourceOpportunityId);
  const destination = opportunityById(opportunities, input.destinationOpportunityId);
  if (!source || !destination) {
    throw new Error("Unknown source or destination market.");
  }
  if (!Number.isFinite(input.amountUsdc) || input.amountUsdc <= 0 || input.amountUsdc > 1_000_000) {
    throw new Error("Amount must be between 0 and 1,000,000 USDC.");
  }
  if (!Number.isFinite(input.minimumDestinationUsdc) || input.minimumDestinationUsdc < 0) {
    throw new Error("Minimum destination output is invalid.");
  }

  let owner: PublicKey;
  try {
    owner = new PublicKey(input.owner);
  } catch {
    throw new Error("Owner is not a public key.");
  }

  const settlement = settlementAmounts(input.amountUsdc, source, destination, false);
  const expectedBase = toBaseUnits(settlement.expectedDestinationUsdc);
  const minimumBase = toBaseUnits(input.minimumDestinationUsdc);
  if (expectedBase < minimumBase) {
    throw new Error("Expected shares are below the minimum-output guard.");
  }

  const mints = await getDevnetMints();
  const sourceMint = mints.shareMints[source.id];
  const destinationMint = mints.shareMints[destination.id];
  if (!sourceMint || !destinationMint) {
    throw new Error("Devnet receipt mint is not configured for this market.");
  }

  const userUsdc = getAssociatedTokenAddressSync(
    mints.usdcMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const userSource = getAssociatedTokenAddressSync(
    sourceMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const userDestination = getAssociatedTokenAddressSync(
    destinationMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const amountBase = toBaseUnits(input.amountUsdc);
  const netBase = toBaseUnits(settlement.netWithdrawnUsdc);
  const transaction = new Transaction();
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      userUsdc,
      owner,
      mints.usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      userSource,
      owner,
      sourceMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      userDestination,
      owner,
      destinationMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createBurnCheckedInstruction(
      userSource,
      sourceMint,
      owner,
      amountBase,
      USDC_DECIMALS,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  if (netBase > 0n) {
    transaction.add(
      createTransferCheckedInstruction(
        mints.poolUsdcAccount,
        mints.usdcMint,
        userUsdc,
        mints.authority.publicKey,
        netBase,
        USDC_DECIMALS,
        [],
        TOKEN_PROGRAM_ID,
      ),
      createTransferCheckedInstruction(
        userUsdc,
        mints.usdcMint,
        mints.poolUsdcAccount,
        owner,
        netBase,
        USDC_DECIMALS,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );
  }

  transaction.add(
    createMintToCheckedInstruction(
      destinationMint,
      userDestination,
      mints.authority.publicKey,
      expectedBase,
      USDC_DECIMALS,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const connection = getConnection();
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = owner;
  transaction.recentBlockhash = latest.blockhash;
  transaction.partialSign(mints.authority);

  return {
    transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    expectedDestinationUsdc: settlement.expectedDestinationUsdc,
    minimumDestinationUsdc: input.minimumDestinationUsdc,
    netWithdrawnUsdc: settlement.netWithdrawnUsdc,
    sourceWithdrawalFeeUsd: input.amountUsdc - settlement.netWithdrawnUsdc,
    destinationDepositFeeUsd: settlement.netWithdrawnUsdc - settlement.expectedDestinationUsdc,
    blockhash: latest.blockhash,
  };
}
