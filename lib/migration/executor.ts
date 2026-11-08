import type { Connection, Transaction } from "@solana/web3.js";

type SendTransaction = (
  transaction: Transaction,
  connection: Connection,
) => Promise<string>;

export async function executeMigration(
  connection: Connection,
  sendTransaction: SendTransaction,
  transaction: Transaction,
): Promise<string> {
  const signature = await sendTransaction(transaction, connection);
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return signature;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
