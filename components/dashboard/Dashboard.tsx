"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ActivePositionsBar } from "@/components/positions/ActivePositionsBar";
import { OpportunityCardList } from "@/components/opportunities/OpportunityCardList";
import { FormulaBreakdownModal } from "@/components/opportunities/FormulaBreakdownModal";
import { MigrationPreviewDrawer } from "@/components/migration/MigrationPreviewDrawer";
import { MigrationSuccessModal } from "@/components/migration/MigrationSuccessModal";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePositions } from "@/hooks/usePositions";
import { useYieldComparison } from "@/hooks/useYieldComparison";
import { useMigration } from "@/hooks/useMigration";
import { Alert, AlertDescription, AlertTitle } from "@/components/glaze/ui/alert";
import { Badge } from "@/components/glaze/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/glaze/ui/segmented-control";
import { Slider } from "@/components/glaze/ui/slider";
import {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  UserPosition,
} from "@/types/flume";
import { formatUsd } from "@/lib/format";

export function Dashboard() {
  const searchParams = useSearchParams();
  const actParam = searchParams.get("act");
  const amountParam = searchParams.get("amount");

  const [holdingDays, setHoldingDays] = useState<HoldingHorizonDays>(90);
  const [rewardHaircutPct, setRewardHaircutPct] = useState<number>(50);
  const [inspected, setInspected] = useState<EvaluatedOpportunity | null>(null);
  const [actionSource, setActionSource] = useState<"deposit" | "wallet">("deposit");
  const [hasHandledAct, setHasHandledAct] = useState(false);

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

  const isDevnet = oppData?.devnet ?? true;

  const walletRouteSource: UserPosition | null =
    connected && balancesAvailable && usdcWalletBalance > 0 && walletAddress
      ? {
          opportunityId: "wallet-usdc",
          protocol: "Wallet",
          market: isDevnet ? "Devnet USDC" : "USDC",
          depositedUsdc: usdcWalletBalance,
          rawShares: Math.round(usdcWalletBalance * 1_000_000).toString(),
          shareMintAddress: usdcMint,
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          marketAddress: walletAddress,
          currentBaseApy: 0,
          currentRewardApy: 0,
          source: "wallet_usdc",
          network: isDevnet ? "devnet" : "mainnet-beta",
          lastRefreshedAt: 0,
        }
      : null;

  // Active source selected by user (either moving existing deposit or investing liquid wallet cash)
  const isInvestingCash = actionSource === "wallet" || !primaryPosition;
  const activeSource: UserPosition | null = isInvestingCash
    ? walletRouteSource
    : primaryPosition;

  const verb = activeSource?.source === "wallet_usdc" || !primaryPosition ? "invest" : "move";
  const comparisonPosition = isInvestingCash ? null : primaryPosition;

  // Comparison principal for ranking opportunities on dashboard
  const comparisonPrincipal = activeSource
    ? activeSource.depositedUsdc
    : 100;

  const rankedOpportunities = useYieldComparison({
    opportunities: oppData?.opportunities ?? [],
    currentPosition: comparisonPosition,
    principalUsd: comparisonPrincipal,
    holdingDays,
    rewardHaircut: rewardHaircutPct / 100,
  });

  const migration = useMigration();

  const comparisonName = comparisonPosition ? comparisonPosition.protocol : "cash";

  const maxAvailableUsdc = activeSource
    ? activeSource.depositedUsdc
    : 100;

  // Handle direct activation from compare page
  useEffect(() => {
    if (actParam && !hasHandledAct && rankedOpportunities.length > 0 && activeSource) {
      const target = rankedOpportunities.find((r) => r.opportunity.id === actParam);
      if (target) {
        const amt = amountParam ? Math.min(Number(amountParam), maxAvailableUsdc) : maxAvailableUsdc;
        migration.openPreview(target, activeSource, amt > 0 ? amt : maxAvailableUsdc);
        setHasHandledAct(true);
      }
    }
  }, [actParam, amountParam, hasHandledAct, rankedOpportunities, activeSource, maxAvailableUsdc, migration]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {/* Header section with brand, navigation & inline filter bar */}
      <div className="flex flex-col gap-4 border-b border-line-faint pb-4">
        {/* Top brand & navbar row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="type-title">Flume</h1>
            <Link
              href="/compare"
              className="type-label-sm text-text-2 hover:text-text-1 transition-colors"
            >
              Compare Protocols ↗
            </Link>
          </div>
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

        {/* Filter Bar: Select Source + Assumptions (Horizon & Haircut) */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {/* Select Source */}
          {primaryPosition && walletRouteSource && usdcWalletBalance > 0 ? (
            <div className="flex items-center gap-2">
              <span className="type-label-sm text-text-3">Source:</span>
              <SegmentedControl
                size="sm"
                value={actionSource}
                onValueChange={(val) => setActionSource(val as "deposit" | "wallet")}
              >
                <SegmentedControlItem value="deposit">
                  Move {primaryPosition.protocol} ({formatUsd(primaryPosition.depositedUsdc)})
                </SegmentedControlItem>
                <SegmentedControlItem value="wallet">
                  Invest extra cash ({formatUsd(usdcWalletBalance)})
                </SegmentedControlItem>
              </SegmentedControl>
            </div>
          ) : primaryPosition ? (
            <div className="flex items-center gap-2">
              <span className="type-label-sm text-text-3">Source:</span>
              <Badge variant="ok">
                {primaryPosition.protocol} deposit ({formatUsd(primaryPosition.depositedUsdc)})
              </Badge>
            </div>
          ) : connected && balancesAvailable && usdcWalletBalance > 0 ? (
            <div className="flex items-center gap-2">
              <span className="type-label-sm text-text-3">Source:</span>
              <Badge variant="neutral">
                Wallet ({formatUsd(usdcWalletBalance)})
              </Badge>
            </div>
          ) : null}

          {/* Holding Horizon */}
          <div className="flex items-center gap-2">
            <span className="type-label-sm text-text-3">Horizon:</span>
            <SegmentedControl
              size="sm"
              value={String(holdingDays)}
              onValueChange={(val) => setHoldingDays(Number(val) as HoldingHorizonDays)}
            >
              {[7, 30, 90, 365].map((d) => (
                <SegmentedControlItem key={d} value={String(d)}>
                  {d}d
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          {/* Reward Haircut */}
          <div className="flex items-center gap-2">
            <span className="type-label-sm text-text-3 whitespace-nowrap">
              Haircut: {rewardHaircutPct}%
            </span>
            <div className="w-24 sm:w-28">
              <Slider
                aria-label="Reward haircut"
                min={0}
                max={100}
                step={5}
                value={[rewardHaircutPct]}
                onValueChange={(val) => {
                  const next = Array.isArray(val) ? val[0] : val;
                  if (typeof next === "number") setRewardHaircutPct(next);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {balanceError ? (
        <Alert status="fail">
          <AlertTitle>Devnet balance unavailable</AlertTitle>
          <AlertDescription>
            The read for official devnet USDC failed. Refresh once the RPC responds.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Main Two-Column Layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left Side: Lending Protocols (takes remaining space) */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="type-heading">Lending Protocols</h2>
            <span className="type-label-sm text-text-2">
              {rankedOpportunities.length} markets available
            </span>
          </div>
          <OpportunityCardList
            rows={rankedOpportunities}
            loading={oppLoading}
            currentName={comparisonName}
            verb={verb}
            canFund={Boolean(activeSource)}
            onInspect={setInspected}
            onAct={(row) => {
              if (activeSource) {
                migration.openPreview(row, activeSource, maxAvailableUsdc);
              }
            }}
          />
        </section>

        {/* Vertical divider */}
        <div className="hidden lg:block w-px self-stretch bg-line" />

        {/* Right Side: Fixed/Sticky Your Position Card (w-full lg:w-72 xl:w-80 shrink-0 sticky top-6) */}
        <aside className="w-full shrink-0 lg:w-72 xl:w-80 lg:sticky lg:top-6 self-start">
          {primaryPosition ? (
            <ActivePositionsBar
              position={primaryPosition}
              usdcWalletBalance={balancesAvailable ? usdcWalletBalance : 0}
            />
          ) : (
            <Card className="border-line-strong">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="type-heading-sm">Your Position</CardTitle>
                  <Badge variant={connected ? "ok" : "neutral"}>
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <CardDescription>
                  {connected
                    ? balancesAvailable
                      ? `No open deposit. You have ${formatUsd(usdcWalletBalance)} liquid USDC in your wallet ready to invest.`
                      : "Reading devnet balances..."
                    : "Connect a Solana wallet to view your active deposits or invest USDC."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </aside>
      </div>

      <FormulaBreakdownModal
        row={inspected}
        currentName={comparisonName}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
      />
      <MigrationPreviewDrawer
        row={migration.selectedEvaluation}
        mode={migration.sourcePosition?.source === "wallet_usdc" ? "invest" : verb}
        sourceName={
          migration.sourcePosition?.source === "wallet_usdc"
            ? "your wallet"
            : (migration.sourcePosition?.protocol ?? "your wallet")
        }
        amountUsdc={migration.amountUsdc}
        onAmountChange={migration.updateAmount}
        maxAmountUsdc={
          migration.sourcePosition?.source === "wallet_usdc"
            ? usdcWalletBalance
            : (migration.sourcePosition?.depositedUsdc ?? maxAvailableUsdc)
        }
        built={migration.builtTx}
        simulation={migration.simulation}
        pending={migration.isBuilding || migration.isExecuting}
        error={migration.error}
        acknowledgeSlippage={migration.acknowledgeSlippage}
        onAcknowledgeSlippage={migration.toggleAcknowledgeSlippage}
        guardDetails={migration.guardDetails}
        primaryPosition={primaryPosition}
        walletPosition={walletRouteSource}
        walletUsdcAvailable={balancesAvailable ? usdcWalletBalance : 0}
        onSwitchSource={migration.switchSource}
        canSign={Boolean(connected && activeSource)}
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
