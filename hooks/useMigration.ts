"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { Transaction } from "@solana/web3.js";
import { executeMigration } from "@/lib/migration/executor";
import { deserializeTransaction, simulateMigration } from "@/lib/migration/simulator";
import type {
  EvaluatedOpportunity,
  MigrationBuildResponse,
  SimulationResult,
  UserPosition,
} from "@/types/flume";

export function useMigration(input: {
  source: UserPosition | null;
  onConfirmed: () => void;
}) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [target, setTarget] = useState<EvaluatedOpportunity | null>(null);
  const [built, setBuilt] = useState<MigrationBuildResponse | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const closePreview = useCallback(() => {
    setTarget(null);
    setBuilt(null);
    setTransaction(null);
    setSimulation(null);
    setError(null);
    setPending(false);
  }, []);

  const openPreview = useCallback(
    async (row: EvaluatedOpportunity) => {
      setTarget(row);
      setBuilt(null);
      setTransaction(null);
      setSimulation(null);
      setSignature(null);
      setError(null);
      if (!publicKey || !input.source || input.source.preview) return;

      setPending(true);
      try {
        const response = await fetch("/api/migration/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            owner: publicKey.toBase58(),
            sourceOpportunityId: input.source.opportunityId,
            destinationOpportunityId: row.opportunity.id,
            amountUsdc: row.principalUsd,
            minimumDestinationUsdc: row.minimumDestinationUsdc,
          }),
        });
        const body = (await response.json()) as MigrationBuildResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not build the migration.");
        const tx = deserializeTransaction(body.transaction);
        setBuilt(body);
        setTransaction(tx);
        setSimulation(await simulateMigration(connection, tx));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Simulation failed.");
      } finally {
        setPending(false);
      }
    },
    [connection, input.source, publicKey],
  );

  const execute = useCallback(async () => {
    if (!transaction) throw new Error("Simulate the migration before signing.");
    if (!simulation?.success) throw new Error(simulation?.error ?? "Simulation did not succeed.");
    const confirmed = await executeMigration(connection, sendTransaction, transaction);
    setSignature(confirmed);
    setTarget(null);
    input.onConfirmed();
    return confirmed;
  }, [connection, input, sendTransaction, simulation, transaction]);

  return {
    target,
    built,
    simulation,
    signature,
    error,
    pending,
    openPreview,
    closePreview,
    execute,
    dismissReceipt: () => setSignature(null),
  };
}
