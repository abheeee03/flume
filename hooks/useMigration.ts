'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { simulateMigrationTransaction } from '@/lib/migration/simulator';
import { executeMigrationTransaction } from '@/lib/migration/executor';
import {
  BuiltMigrationTransaction,
  EvaluatedOpportunity,
  SimulationResult,
  UserPosition,
} from '@/types/flume';

export function useMigration() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EvaluatedOpportunity | null>(null);
  const [builtTx, setBuiltTx] = useState<BuiltMigrationTransaction | null>(
    null
  );
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSignature, setExecutionSignature] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const openPreview = useCallback(
    async (
      evaluated: EvaluatedOpportunity,
      currentPosition: UserPosition
    ) => {
      setSelectedEvaluation(evaluated);
      setBuiltTx(null);
      setSimulation(null);
      setExecutionSignature(null);
      setError(null);

      if (!wallet.publicKey) {
        return;
      }

      setIsBuilding(true);
      try {
        const res = await fetch('/api/migration/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: wallet.publicKey.toBase58(),
            sourceOpportunityId: currentPosition.opportunityId,
            destinationOpportunityId: evaluated.opportunity.id,
            amountUsdc: evaluated.principalUsd,
            minimumDestinationUsdc: evaluated.minimumDestinationUsdc,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to build transaction');
        }

        const built = data as BuiltMigrationTransaction;
        setBuiltTx(built);

        const simResult = await simulateMigrationTransaction(
          connection,
          built.serializedTransaction
        );
        setSimulation(simResult);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to prepare migration preview'
        );
      } finally {
        setIsBuilding(false);
      }
    },
    [connection, wallet.publicKey]
  );

  const executeMigration = useCallback(async () => {
    if (!builtTx) {
      setError('Transaction is not built yet.');
      return;
    }
    setIsExecuting(true);
    setError(null);

    try {
      const { signature } = await executeMigrationTransaction({
        connection,
        wallet,
        base64Transaction: builtTx.serializedTransaction,
        blockhash: builtTx.blockhash,
        lastValidBlockHeight: builtTx.lastValidBlockHeight,
      });

      setExecutionSignature(signature);
      await queryClient.invalidateQueries({ queryKey: ['flume-positions'] });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Transaction execution failed'
      );
    } finally {
      setIsExecuting(false);
    }
  }, [builtTx, connection, queryClient, wallet]);

  const closePreview = useCallback(() => {
    setSelectedEvaluation(null);
    setBuiltTx(null);
    setSimulation(null);
    setError(null);
  }, []);

  return {
    selectedEvaluation,
    builtTx,
    simulation,
    isBuilding,
    isExecuting,
    executionSignature,
    error,
    openPreview,
    executeMigration,
    closePreview,
    clearReceipt: () => setExecutionSignature(null),
  };
}