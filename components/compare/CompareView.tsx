"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CURATED_MARKETS } from "@/config/markets";
import { evaluateOpportunity } from "@/lib/yield-engine/calculator";
import {
  formatPercent,
  formatShares,
  formatSignedUsd,
  formatUsd,
  formatUsdCompact,
  horizonLabel,
} from "@/lib/format";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePositions } from "@/hooks/usePositions";
import { Badge } from "@/components/glaze/ui/badge";
import { Button } from "@/components/glaze/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/glaze/ui/data-list";
import { Field, FieldLabel } from "@/components/glaze/ui/field";
import { Input } from "@/components/glaze/ui/input";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/glaze/ui/segmented-control";
import { RiskBadgeList } from "@/components/opportunities/RiskBadgeList";
import { Navbar } from "@/components/layout/Navbar";
import { DisclosureBanner } from "@/components/layout/DisclosureBanner";
import type { HoldingHorizonDays, StrategyCategory, YieldOpportunity } from "@/types/flume";

const HORIZONS: HoldingHorizonDays[] = [7, 30, 90, 365];

const STRATEGY_LABELS: Record<StrategyCategory, string> = {
  plain_lending: "Plain lending",
  dynamic_vault: "Dynamic vault",
  curated_vault: "Curated vault",
  leveraged_looping: "Leveraged looping",
  delta_neutral: "Delta neutral",
};

export function CompareView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sourceParam = searchParams.get("source") || "wallet-usdc";
  const destParam = searchParams.get("dest") || CURATED_MARKETS[0]?.id || "";
  const initialAmount = Number(searchParams.get("amount")) || 100;
  const initialDays = (Number(searchParams.get("days")) as HoldingHorizonDays) || 90;

  const [holdingDays, setHoldingDays] = useState<HoldingHorizonDays>(
    HORIZONS.includes(initialDays) ? initialDays : 90
  );
  const [rewardHaircutPct] = useState<number>(50);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sourceParam);
  const [selectedDestId, setSelectedDestId] = useState<string>(destParam);
  const [amount, setAmount] = useState<number>(initialAmount);

  const {
    data: oppData,
    isLoading: oppLoading,
    refetch: refetchOpps,
  } = useOpportunities();

  const {
    connected,
    primaryPosition,
    solWalletBalance,
    usdcWalletBalance,
    balancesAvailable,
    usdcMint,
    refetch: refetchPositions,
  } = usePositions();

  // If user opens compare without an explicit sourceParam, sync to their active deposit if available
  useEffect(() => {
    if (!searchParams.get("source") && primaryPosition?.opportunityId) {
      setSelectedSourceId(primaryPosition.opportunityId);
    }
  }, [primaryPosition, searchParams]);

  const isDevnet = oppData?.devnet ?? true;

  const opportunities = oppData?.opportunities ?? (CURATED_MARKETS as unknown as YieldOpportunity[]);

  // Find destination opportunity
  const destOpportunity = useMemo(() => {
    return (
      opportunities.find((o) => o.id === selectedDestId) ??
      opportunities[0] ??
      null
    );
  }, [opportunities, selectedDestId]);

  // Find source opportunity (if not wallet)
  const isSourceWallet = selectedSourceId === "wallet-usdc";
  const sourceOpportunity = useMemo(() => {
    if (isSourceWallet) return null;
    return opportunities.find((o) => o.id === selectedSourceId) ?? null;
  }, [isSourceWallet, opportunities, selectedSourceId]);

  // Sourced UserPosition representation for calculation
  const sourceUserPosition = useMemo(() => {
    if (isSourceWallet) {
      return {
        opportunityId: "wallet-usdc",
        protocol: "Wallet",
        market: isDevnet ? "Devnet USDC" : "USDC",
        depositedUsdc: amount,
        rawShares: Math.round(amount * 1_000_000).toString(),
        shareMintAddress: usdcMint,
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        marketAddress: "wallet",
        currentBaseApy: 0,
        currentRewardApy: 0,
        source: "wallet_usdc" as const,
        network: isDevnet ? ("devnet" as const) : ("mainnet-beta" as const),
        lastRefreshedAt: 0,
      };
    }
    if (sourceOpportunity) {
      return {
        opportunityId: sourceOpportunity.id,
        protocol: sourceOpportunity.protocol,
        market: sourceOpportunity.market,
        depositedUsdc: amount,
        rawShares: Math.round(amount * 1_000_000).toString(),
        shareMintAddress: sourceOpportunity.activeAddresses?.collateralOrShareMint ?? "",
        programId: sourceOpportunity.activeAddresses?.programId ?? "",
        marketAddress: sourceOpportunity.activeAddresses?.marketOrVaultAddress ?? "",
        currentBaseApy: sourceOpportunity.baseApy,
        currentRewardApy: sourceOpportunity.rewardApy,
        source: "onchain_rpc" as const,
        network: isDevnet ? ("devnet" as const) : ("mainnet-beta" as const),
        lastRefreshedAt: 0,
      };
    }
    return null;
  }, [amount, isDevnet, isSourceWallet, sourceOpportunity, usdcMint]);

  // Evaluated comparison between source and destination
  const evaluation = useMemo(() => {
    if (!destOpportunity) return null;
    return evaluateOpportunity({
      opportunity: destOpportunity,
      currentPosition: sourceUserPosition,
      sourceOpportunity,
      principalUsd: amount,
      holdingDays,
      rewardHaircut: rewardHaircutPct / 100,
    });
  }, [
    destOpportunity,
    holdingDays,
    amount,
    rewardHaircutPct,
    sourceOpportunity,
    sourceUserPosition,
  ]);

  const sourceEffectiveApy = sourceOpportunity
    ? sourceOpportunity.baseApy + sourceOpportunity.rewardApy * (rewardHaircutPct / 100)
    : 0;

  const destEffectiveApy = destOpportunity
    ? destOpportunity.baseApy + destOpportunity.rewardApy * (rewardHaircutPct / 100)
    : 0;

  const apyDelta = destEffectiveApy - sourceEffectiveApy;

  const sourceProjectedGain =
    amount * sourceEffectiveApy * (holdingDays / 365);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {/* Navigation bar & Title */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="type-label-sm text-text-2 hover:text-text-1"
            >
              ← Dashboard
            </Link>
            <span className="text-line">/</span>
            <h1 className="type-title text-xl">Protocol Comparison</h1>
          </div>
          <Navbar
            connected={connected}
            isDevnet={isDevnet}
            solBalance={solWalletBalance}
            usdcBalance={usdcWalletBalance}
            balancesAvailable={balancesAvailable}
            onRefresh={() => {
              refetchOpps();
              refetchPositions();
            }}
          />
        </div>
        <p className="type-body text-text-2">
          Head-to-head financial analysis, net yield projection, security audits, and risk assessment.
        </p>
        <DisclosureBanner isDevnet={isDevnet} usdcMint={usdcMint} />
      </div>

      {/* Selectors Bar */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel>Compare from (Source)</FieldLabel>
            <select
              className="field w-full rounded-pill border border-line bg-field px-3 py-1.5 type-label text-text-1"
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
            >
              <option value="wallet-usdc">
                Wallet USDC ({formatUsd(usdcWalletBalance)} liquid)
              </option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.protocol} — {opp.market} ({formatPercent(opp.headlineApy)})
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel>Compare to (Destination)</FieldLabel>
            <select
              className="field w-full rounded-pill border border-line bg-field px-3 py-1.5 type-label text-text-1"
              value={selectedDestId}
              onChange={(e) => setSelectedDestId(e.target.value)}
            >
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.protocol} — {opp.market} ({formatPercent(opp.headlineApy)})
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel>Principal amount (USDC)</FieldLabel>
            <Input
              type="number"
              min="1"
              value={String(amount)}
              onValueChange={(val) => {
                const n = Number(val);
                if (n > 0) setAmount(n);
              }}
            />
          </Field>

          <Field>
            <FieldLabel>Holding horizon</FieldLabel>
            <SegmentedControl
              value={String(holdingDays)}
              onValueChange={(val) => setHoldingDays(Number(val) as HoldingHorizonDays)}
            >
              {HORIZONS.map((d) => (
                <SegmentedControlItem key={d} value={String(d)}>
                  {d}d
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Field>
        </CardContent>
      </Card>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Source Protocol Card */}
        <Card className={isSourceWallet ? "border-line" : "border-line-strong"}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <Badge variant={primaryPosition?.opportunityId === selectedSourceId ? "ok" : "neutral"}>
                {isSourceWallet
                  ? "Liquid cash"
                  : primaryPosition?.opportunityId === selectedSourceId
                  ? "Your active deposit"
                  : "Current holding"}
              </Badge>
              <span className="type-caption text-text-3">
                {sourceOpportunity
                  ? STRATEGY_LABELS[sourceOpportunity.strategyType]
                  : "Uninvested cash"}
              </span>
            </div>
            <CardTitle>
              {sourceOpportunity
                ? `${sourceOpportunity.protocol} ${sourceOpportunity.market}`
                : "Wallet Devnet USDC"}
            </CardTitle>
            <CardDescription>
              {sourceOpportunity
                ? `Base APY ${formatPercent(sourceOpportunity.baseApy)}, rewards ${formatPercent(sourceOpportunity.rewardApy)}`
                : "0% APY · Ready to be deployed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataList>
              <DataListItem>
                <DataListLabel>Net Effective APY</DataListLabel>
                <DataListValue className="type-heading-sm">
                  {formatPercent(sourceEffectiveApy)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Projected return over {holdingDays}d</DataListLabel>
                <DataListValue>
                  {formatSignedUsd(sourceProjectedGain)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Total Value Locked (TVL)</DataListLabel>
                <DataListValue>
                  {sourceOpportunity?.tvlUsd
                    ? formatUsdCompact(sourceOpportunity.tvlUsd)
                    : "N/A"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Utilization rate</DataListLabel>
                <DataListValue>
                  {sourceOpportunity?.utilization != null
                    ? formatPercent(sourceOpportunity.utilization)
                    : "0%"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Withdrawal fee</DataListLabel>
                <DataListValue>
                  {sourceOpportunity
                    ? `${sourceOpportunity.fees.withdrawalBps} bps (${(sourceOpportunity.fees.withdrawalBps / 100).toFixed(2)}%)`
                    : "0 bps"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Security & audits</DataListLabel>
                <DataListValue className="text-right">
                  {sourceOpportunity?.auditStatus ?? "Native SPL token"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Oracle provider</DataListLabel>
                <DataListValue>
                  {sourceOpportunity?.oracleProvider ?? "None (Liquid)"}
                </DataListValue>
              </DataListItem>
            </DataList>
          </CardContent>
          {sourceOpportunity?.riskFlags && sourceOpportunity.riskFlags.length > 0 ? (
            <CardFooter className="flex flex-col items-start gap-2 border-t border-line-faint pt-3">
              <span className="type-caption text-text-3">Risk dimensions:</span>
              <RiskBadgeList signals={sourceOpportunity.riskFlags} />
            </CardFooter>
          ) : null}
        </Card>

        {/* Destination Protocol Card */}
        {destOpportunity ? (
          <Card className="border-ok-tint bg-paper">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="ok">Target Opportunity</Badge>
                <span className="type-caption text-text-3">
                  {STRATEGY_LABELS[destOpportunity.strategyType]}
                </span>
              </div>
              <CardTitle>
                {destOpportunity.protocol} {destOpportunity.market}
              </CardTitle>
              <CardDescription>
                Base APY {formatPercent(destOpportunity.baseApy)}, rewards {formatPercent(destOpportunity.rewardApy)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataList>
                <DataListItem>
                  <DataListLabel>Net Effective APY</DataListLabel>
                  <DataListValue className="type-heading-sm text-ok">
                    {formatPercent(destEffectiveApy)}
                    {apyDelta > 0 ? (
                      <span className="type-label-sm ms-2 text-ok">
                        (+{formatPercent(apyDelta)})
                      </span>
                    ) : null}
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Projected return over {holdingDays}d</DataListLabel>
                  <DataListValue className="text-ok">
                    {evaluation ? formatSignedUsd(evaluation.netReturnUsd) : "$0.00"}
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Total Value Locked (TVL)</DataListLabel>
                  <DataListValue>
                    {destOpportunity.tvlUsd
                      ? formatUsdCompact(destOpportunity.tvlUsd)
                      : "N/A"}
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Utilization rate</DataListLabel>
                  <DataListValue>
                    {destOpportunity.utilization != null
                      ? formatPercent(destOpportunity.utilization)
                      : "N/A"}
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Deposit fee</DataListLabel>
                  <DataListValue>
                    {destOpportunity.fees.depositBps} bps ({(destOpportunity.fees.depositBps / 100).toFixed(2)}%)
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Security & audits</DataListLabel>
                  <DataListValue className="text-right">
                    {destOpportunity.auditStatus}
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Oracle provider</DataListLabel>
                  <DataListValue>{destOpportunity.oracleProvider}</DataListValue>
                </DataListItem>
              </DataList>
            </CardContent>
            {destOpportunity.riskFlags && destOpportunity.riskFlags.length > 0 ? (
              <CardFooter className="flex flex-col items-start gap-2 border-t border-line-faint pt-3">
                <span className="type-caption text-text-3">Risk dimensions:</span>
                <RiskBadgeList signals={destOpportunity.riskFlags} />
              </CardFooter>
            ) : null}
          </Card>
        ) : null}
      </div>

      {/* Financial ROI & Migration Impact Matrix */}
      {evaluation ? (
        <Card>
          <CardHeader>
            <CardTitle>Financial Impact & Break-Even Analysis</CardTitle>
            <CardDescription>
              Modeled for {formatUsd(amount)} USDC over a {horizonLabel(holdingDays)} holding horizon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1 rounded-panel border border-line p-3">
                <span className="type-caption text-text-3">Principal Size</span>
                <span className="type-heading-sm">{formatUsd(amount)}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-panel border border-line p-3">
                <span className="type-caption text-text-3">Total Migration Costs</span>
                <span className="type-heading-sm text-text-2">
                  {formatUsd(evaluation.costs.totalOneTimeCostUsd)}
                </span>
                <span className="type-caption text-text-3">
                  Withdrawal + deposit + network fees
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-panel border border-line p-3">
                <span className="type-caption text-text-3">Incremental Advantage</span>
                <span className="type-heading-sm text-ok">
                  {formatSignedUsd(evaluation.incrementalGainVsCurrentUsd)}
                </span>
                <span className="type-caption text-text-3">
                  Net profit beyond current holding
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-panel border border-line p-3">
                <span className="type-caption text-text-3">Break-Even Timeline</span>
                <span className="type-heading-sm">
                  {evaluation.breakEvenDays == null
                    ? "Never"
                    : `${evaluation.breakEvenDays.toFixed(1)} days`}
                </span>
                <span className="type-caption text-text-3">
                  {evaluation.breakEvenStatus === "instant"
                    ? "Immediate payback"
                    : evaluation.breakEvenStatus === "worth_it"
                    ? "Well within horizon"
                    : "Exceeds holding horizon"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-panel border border-line-faint bg-field p-3">
              <span className="type-label">Liquidity & Withdrawal Rules</span>
              <ul className="flex flex-col gap-1 text-text-2 type-body-sm">
                {destOpportunity?.withdrawalRestrictions.map((rule, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-pill bg-ink" />
                    <span>{rule}</span>
                  </li>
                ))}
                {destOpportunity?.withdrawLiquidityUsd != null ? (
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-pill bg-ink" />
                    <span>
                      Instant pool reserve: {formatUsdCompact(destOpportunity.withdrawLiquidityUsd)} available.
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-line-faint pt-3">
            <span className="type-body-sm text-text-2">
              Ready to execute this yield migration atomically?
            </span>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="type-label-sm text-text-2 hover:text-text-1">
                Back to dashboard
              </Link>
              <Button
                variant="confirm"
                onClick={() => {
                  router.push(`/dashboard?act=${destOpportunity?.id}&amount=${amount}`);
                }}
              >
                Proceed to migrate on dashboard
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
