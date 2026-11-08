'use client';

import { useState, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { CURATED_MARKETS } from '@/config/markets';
import { simulateMigrationTransaction } from '@/lib/migration/simulator';
import { executeMigrationTransaction } from '@/lib/migration/executor';
import { evaluateOpportunity } from '@/lib/yield-engine/calculator';
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
  const [sourcePosition, setSourcePosition] =
    useState<UserPosition | null>(null);
  const [amountUsdc, setAmountUsdc] = useState<number>(100);
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
  const [acknowledgeSlippage, setAcknowledgeSlippage] = useState<boolean>(false);
  const [guardDetails, setGuardDetails] = useState<{
    expectedUsdc: number;
    minimumUsdc: number;
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const buildAndSimulate = useCallback(
    async (
      evalRow: EvaluatedOpportunity,
      srcPos: UserPosition,
      targetAmount: number,
      ackSlippage: boolean = false
    ) => {
      if (!wallet.publicKey) return;

      setIsBuilding(true);
      setError(null);
      try {
        const res = await fetch('/api/migration/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: wallet.publicKey.toBase58(),
            sourceOpportunityId: srcPos.opportunityId,
            destinationOpportunityId: evalRow.opportunity.id,
            amountUsdc: targetAmount,
            minimumDestinationUsdc: evalRow.minimumDestinationUsdc,
            acknowledgeSlippage: ackSlippage,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'MINIMUM_OUTPUT_GUARD') {
            setGuardDetails({
              expectedUsdc: data.expectedUsdc,
              minimumUsdc: data.minimumUsdc,
            });
          }
          throw new Error(data.error || 'Failed to build transaction');
        }

        // On successful build, clear guard warning if active
        setGuardDetails(null);

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

  const openPreview = useCallback(
    async (
      evaluated: EvaluatedOpportunity,
      currentPosition: UserPosition,
      initialAmount?: number
    ) => {
      const targetAmount =
        initialAmount ??
        (currentPosition.source !== 'wallet_usdc' && currentPosition.depositedUsdc > 0
          ? currentPosition.depositedUsdc
          : evaluated.principalUsd || 100);

      const sourceOpp =
        CURATED_MARKETS.find((m) => m.id === currentPosition.opportunityId) ?? null;

      // Re-evaluate opportunity with accurate source opportunity fees
      const currentEval = evaluateOpportunity({
        opportunity: evaluated.opportunity,
        currentPosition,
        sourceOpportunity: sourceOpp,
        principalUsd: targetAmount,
        holdingDays: evaluated.holdingDays,
        rewardHaircut: evaluated.rewardHaircut,
      });

      setSelectedEvaluation(currentEval);
      setSourcePosition(currentPosition);
      setAmountUsdc(targetAmount);
      setBuiltTx(null);
      setSimulation(null);
      setExecutionSignature(null);
      setError(null);
      setAcknowledgeSlippage(false);
      setGuardDetails(null);

      await buildAndSimulate(currentEval, currentPosition, targetAmount, false);
    },
    [buildAndSimulate]
  );

  const updateAmount = useCallback(
    (newAmount: number) => {
      setAmountUsdc(newAmount);
      setError(null);

      if (!selectedEvaluation || !sourcePosition) return;

      const sourceOpp =
        CURATED_MARKETS.find((m) => m.id === sourcePosition.opportunityId) ?? null;

      // Immediately recompute preview calculations synchronously
      const updatedEval = evaluateOpportunity({
        opportunity: selectedEvaluation.opportunity,
        currentPosition: sourcePosition,
        sourceOpportunity: sourceOpp,
        principalUsd: newAmount,
        holdingDays: selectedEvaluation.holdingDays,
        rewardHaircut: selectedEvaluation.rewardHaircut,
      });
      setSelectedEvaluation(updatedEval);

      // Debounce on-chain transaction building and simulation by 300ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        buildAndSimulate(updatedEval, sourcePosition, newAmount, acknowledgeSlippage);
      }, 300);
    },
    [acknowledgeSlippage, buildAndSimulate, selectedEvaluation, sourcePosition]
  );

  const toggleAcknowledgeSlippage = useCallback(
    (checked: boolean) => {
      setAcknowledgeSlippage(checked);
      if (!selectedEvaluation || !sourcePosition) return;

      if (checked) {
        // Clear error and trigger build with acknowledgeSlippage=true
        setError(null);
        buildAndSimulate(selectedEvaluation, sourcePosition, amountUsdc, true);
      }
    },
    [amountUsdc, buildAndSimulate, selectedEvaluation, sourcePosition]
  );

  const switchSource = useCallback(
    (newSource: UserPosition, newMaxAmount: number) => {
      if (!selectedEvaluation) return;
      setSourcePosition(newSource);
      setAcknowledgeSlippage(false);
      setGuardDetails(null);
      setError(null);

      const targetAmount = Math.min(amountUsdc, Math.max(1, Math.round(newMaxAmount)));
      setAmountUsdc(targetAmount);

      const sourceOpp =
        CURATED_MARKETS.find((m) => m.id === newSource.opportunityId) ?? null;

      const updatedEval = evaluateOpportunity({
        opportunity: selectedEvaluation.opportunity,
        currentPosition: newSource,
        sourceOpportunity: sourceOpp,
        principalUsd: targetAmount,
        holdingDays: selectedEvaluation.holdingDays,
        rewardHaircut: selectedEvaluation.rewardHaircut,
      });
      setSelectedEvaluation(updatedEval);

      buildAndSimulate(updatedEval, newSource, targetAmount, false);
    },
    [amountUsdc, buildAndSimulate, selectedEvaluation]
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

      // Record migration on server for immediate UI sync
      if (wallet.publicKey && selectedEvaluation && sourcePosition) {
        try {
          await fetch('/api/positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: wallet.publicKey.toBase58(),
              fromId: sourcePosition.opportunityId,
              toId: selectedEvaluation.opportunity.id,
              amountUsdc: builtTx.amountUsdc,
              netUsdc: builtTx.netMigratedUsdc,
              signature,
            }),
          });
        } catch {
          // Non-blocking
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['flume-positions'] });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Transaction execution failed'
      );
    } finally {
      setIsExecuting(false);
    }
  }, [builtTx, connection, queryClient, selectedEvaluation, sourcePosition, wallet]);

  const closePreview = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSelectedEvaluation(null);
    setSourcePosition(null);
    setBuiltTx(null);
    setSimulation(null);
    setError(null);
    setAcknowledgeSlippage(false);
    setGuardDetails(null);
  }, []);

  return {
    selectedEvaluation,
    sourcePosition,
    amountUsdc,
    builtTx,
    simulation,
    isBuilding,
    isExecuting,
    executionSignature,
    error,
    acknowledgeSlippage,
    guardDetails,
    openPreview,
    updateAmount,
    toggleAcknowledgeSlippage,
    switchSource,
    executeMigration,
    closePreview,
    clearReceipt: () => setExecutionSignature(null),
  };
}
