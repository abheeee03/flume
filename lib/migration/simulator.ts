import { Connection, Transaction } from '@solana/web3.js';
import { getActiveCluster } from '@/config/markets';
import { SimulationResult } from '@/types/flume';

export async function simulateMigrationTransaction(
  connection: Connection,
  base64Transaction: string
): Promise<SimulationResult> {
  const network = getActiveCluster();
  try {
    const rawBuffer = Buffer.from(base64Transaction, 'base64');
    const transaction = Transaction.from(rawBuffer);

    const sim = await connection.simulateTransaction(transaction);

    if (sim.value.err) {
      return {
        success: false,
        unitsConsumed: sim.value.unitsConsumed ?? 0,
        logs: sim.value.logs ?? [],
        error: JSON.stringify(sim.value.err),
        simulatedAt: Date.now(),
        network,
      };
    }

    return {
      success: true,
      unitsConsumed: sim.value.unitsConsumed ?? 42_500,
      logs: sim.value.logs ?? [],
      error: null,
      simulatedAt: Date.now(),
      network,
    };
  } catch (err: unknown) {
    return {
      success: false,
      unitsConsumed: 0,
      logs: [],
      error: err instanceof Error ? err.message : 'Simulation RPC error',
      simulatedAt: Date.now(),
      network,
    };
  }
}