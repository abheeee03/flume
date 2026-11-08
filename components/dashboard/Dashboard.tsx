"use client";

import React, { useEffect, useState } from "react";
import { DisclosureBanner } from "@/components/layout/DisclosureBanner";
import { Navbar } from "@/components/layout/Navbar";
import { ActivePositionsBar } from "@/components/positions/ActivePositionsBar";
import { YieldControlsBar } from "@/components/controls/YieldControlsBar";
import { OpportunityCardList } from "@/components/opportunities/OpportunityCardList";
import { FormulaBreakdownModal } from "@/components/opportunities/FormulaBreakdownModal";
import { MigrationPreviewDrawer } from "@/components/migration/MigrationPreviewDrawer";
import { MigrationSuccessModal } from "@/components/migration/MigrationSuccessModal";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePositions } from "@/hooks/usePositions";
import { useYieldComparison } from "@/hooks/useYieldComparison";
import { useMigration } from "@/hooks/useMigration";
import { Alert, AlertDescription, AlertTitle } from "@/components/glaze/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/glaze/ui/card";
import {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  UserPosition,
} from "@/types/flume";

export function Dashboard() {
  const [principalUsd, setPrincipalUsd] = useState<number>(100);
  const [holdingDays, setHoldingDays] = useState<HoldingHorizonDays>(90);
  const [rewardHaircutPct, setRewardHaircutPct] = useState<number>(50);
  const [inspected, setInspected] = useState<EvaluatedOpportunity | null>(null);
  const [sizedToWallet, setSizedToWallet] = useState(false);

  const {
    data: oppData,
    isLoading: oppLoading,
    isFetching: oppFetching,
    refetch: refetchOpps,
  } = useOpportunities();

  const {
    connected,
    walletAddress,
    primaryPosition,
    solWalletBalance,
    usdcWalletBalance,
    balancesAvailable,
    balanceError,
    usdcMint,
    isFetching: posFetching,
    refetch: refetchPositions,
  } = usePositions();

  const rankedOpportunities = useYieldComparison({
    opportunities: oppData?.opportunities ?? [],
    currentPosition: primaryPosition,
    principalUsd,
    holdingDays,
    rewardHaircut: rewardHaircutPct / 100,
  });

  const migration = useMigration();
  const isDevnet = oppData?.devnet ?? true;
  const verb = primaryPosition ? "move" : "invest";

  useEffect(() => {
    if (sizedToWallet || !balancesAvailable || usdcWalletBalance <= 0) return;
    setPrincipalUsd(usdcWalletBalance);
    setSizedToWallet(true);
  }, [balancesAvailable, sizedToWallet, usdcWalletBalance]);

  const routeSource: UserPosition | null =
    primaryPosition ??
    (connected && balancesAvailable && usdcWalletBalance > 0 && walletAddress
      ? {
          opportunityId: "wallet-usdc",
          protocol: "Wallet",
          market: "Devnet USDC",
          depositedUsdc: usdcWalletBalance,
          rawShares: Math.round(usdcWalletBalance * 1_000_000).toString(),
          shareMintAddress: usdcMint,
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          marketAddress: walletAddress,
          currentBaseApy: 0,
          currentRewardApy: 0,
          source: "wallet_usdc",
          network: isDevnet ? "devnet" : "mainnet-beta",
          lastRefreshedAt: Date.now(),
        }
      : null);

  const comparisonName = primaryPosition ? primaryPosition.protocol : "cash";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="type-title">Flume</h1>
          <Navbar
            connected={connected}
            isDevnet={isDevnet}
            solBalance={solWalletBalance}
            usdcBalance={usdcWalletBalance}
            balancesAvailable={balancesAvailable}
            isRefreshing={oppFetching || posFetching}
            onRefresh={() => {
              refetchOpps();
              refetchPositions();
            }}
          />
        </div>
        <p className="type-body text-text-2">
          {verb === "invest"
            ? "Compare USDC yields and invest from your wallet."
            : "Compare USDC yields and move an open deposit."}
        </p>
        <DisclosureBanner isDevnet={isDevnet} usdcMint={usdcMint} />
      </div>

      {balanceError ? (
        <Alert status="fail">
          <AlertTitle>Devnet balance unavailable</AlertTitle>
          <AlertDescription>
            The read for official devnet USDC failed. Refresh once the RPC responds.
          </AlertDescription>
        </Alert>
      ) : null}

      {primaryPosition ? (
        <ActivePositionsBar
          position={primaryPosition}
          usdcWalletBalance={balancesAvailable ? usdcWalletBalance : 0}
          onUseWalletUsdc={(amount) => {
            setSizedToWallet(true);
            setPrincipalUsd(amount);
          }}
        />
      ) : (
        <p className="type-body text-text-2">
          {connected
            ? balancesAvailable
              ? `No open deposit. Invest ${usdcWalletBalance.toFixed(2)} USDC from this wallet, or set another amount below.`
              : "No open deposit yet. The devnet USDC balance is still loading."
            : "No open deposit. Connect a devnet wallet to invest official USDC."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{verb === "invest" ? "Investment" : "Move"}</CardTitle>
        </CardHeader>
        <CardContent>
          <YieldControlsBar
            purpose={verb}
            principalUsd={principalUsd}
            onPrincipal={(value) => {
              setSizedToWallet(true);
              setPrincipalUsd(value);
            }}
            holdingDays={holdingDays}
            onHoldingDays={setHoldingDays}
            rewardHaircut={rewardHaircutPct / 100}
            onRewardHaircut={(value) => setRewardHaircutPct(Math.round(value * 100))}
            walletUsdc={balancesAvailable ? usdcWalletBalance : undefined}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="type-heading">Markets</h2>
          <p className="type-body-sm text-text-2">
            {oppLoading
              ? "Loading USDC markets."
              : `Ranked by net return over ${holdingDays} days. ${rankedOpportunities.length} USDC markets.`}
          </p>
        </div>
        <OpportunityCardList
          rows={rankedOpportunities}
          loading={oppLoading}
          currentName={comparisonName}
          verb={verb}
          canFund={Boolean(routeSource)}
          onInspect={setInspected}
          onAct={(row) => {
            if (routeSource) migration.openPreview(row, routeSource);
          }}
        />
      </section>

      <FormulaBreakdownModal
        row={inspected}
        currentName={comparisonName}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
      />
      <MigrationPreviewDrawer
        row={migration.selectedEvaluation}
        mode={verb}
        sourceName={primaryPosition ? primaryPosition.protocol : "your wallet"}
        built={migration.builtTx}
        simulation={migration.simulation}
        pending={migration.isBuilding || migration.isExecuting}
        error={migration.error}
        canSign={Boolean(connected && routeSource)}
        onOpenChange={(open) => {
          if (!open) migration.closePreview();
        }}
        onExecute={migration.executeMigration}
      />
      <MigrationSuccessModal
        mode={verb}
        signature={migration.executionSignature}
        onOpenChange={(open) => {
          if (!open) migration.clearReceipt();
        }}
      />
    </div>
  );
}
