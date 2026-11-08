import { Transaction, VersionedTransaction, type Connection } from "@solana/web3.js";
import type { SimulationResult } from "@/types/flume";

export function deserializeTransaction(base64Tx: string): Transaction {
  const binary = atob(base64Tx);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return Transaction.from(bytes);
}

export async function simulateMigration(
  connection: Connection,
  transaction: Transaction,
): Promise<SimulationResult> {
  const versioned = new VersionedTransaction(transaction.compileMessage());
  const simulated = await connection.simulateTransaction(versioned, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  const err = simulated.value.err;

  return {
    success: err == null,
    unitsConsumed: simulated.value.unitsConsumed ?? 0,
    logs: simulated.value.logs ?? [],
    error: err == null ? null : JSON.stringify(err),
    simulatedAt: Date.now(),
  };
}
