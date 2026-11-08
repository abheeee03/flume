"use client";

import { formatPercent, formatSignedUsd, formatUsdCompact, horizonLabel } from "@/lib/format";
import type { EvaluatedOpportunity, StrategyCategory } from "@/types/flume";
import { Badge } from "@/components/glaze/ui/badge";
import { Button } from "@/components/glaze/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/glaze/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/glaze/ui/progress";
import { Skeleton } from "@/components/glaze/ui/skeleton";
import { RiskBadgeList } from "@/components/opportunities/RiskBadgeList";

const strategyLabel: Record<StrategyCategory, string> = {
  plain_lending: "Plain lending",
  dynamic_vault: "Dynamic vault",
  curated_vault: "Curated vault",
  leveraged_looping: "Leveraged looping",
  delta_neutral: "Delta neutral",
};

const STRATEGY_LABELS = {
  plain_lending: "Plain lending",
  dynamic_vault: "Dynamic vault",
  curated_vault: "Curated vault",
  leveraged_looping: "Leveraged looping",
  delta_neutral: "Delta neutral",
} as const;

function breakEvenBadge(row: EvaluatedOpportunity) {
  if (row.breakEvenStatus === "current") return <Badge variant="neutral">Current position</Badge>;
  if (row.breakEvenStatus === "instant") return <Badge variant="ok">Breaks even immediately</Badge>;
  if (row.breakEvenStatus === "worth_it" && row.breakEvenDays != null) {
    return <Badge variant="ok">Breaks even in {row.breakEvenDays.toFixed(1)} days</Badge>;
  }
  if (row.breakEvenStatus === "exceeds_horizon" && row.breakEvenDays != null) {
    return (
      <Badge variant="warn">
        {row.breakEvenDays.toFixed(1)} days, past the {row.holdingDays} day horizon
      </Badge>
    );
  }
  return <Badge variant="fail">Does not break even</Badge>;
}

export function OpportunityCardList({
  rows,
  loading,
  currentName,
  verb,
  canFund,
  onInspect,
  onAct,
}: {
  rows: EvaluatedOpportunity[];
  loading: boolean;
  currentName: string;
  verb: "invest" | "move";
  canFund: boolean;
  onInspect: (row: EvaluatedOpportunity) => void;
  onAct: (row: EvaluatedOpportunity) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="type-body text-text-2">Yield markets are not available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const opportunity = row.opportunity;
        const utilization = opportunity.utilization;
        const countedReward = opportunity.rewardApy * row.rewardHaircut;
        const blocked = !row.isLiquiditySufficient;
        const actionLabel = !canFund
          ? verb === "invest"
            ? "No USDC to invest"
            : "Nothing to move"
          : verb === "invest"
            ? "Invest"
            : "Move funds";
        return (
          <Card key={opportunity.id}>
            <CardHeader>
              <CardTitle>
                {index + 1}. {opportunity.protocol} {opportunity.market}
              </CardTitle>
              <CardDescription>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{strategyLabel[opportunity.strategyType]}</Badge>
                  <span>
                    TVL {opportunity.tvlUsd == null ? "Unavailable" : formatUsdCompact(opportunity.tvlUsd)}
                    {opportunity.withdrawLiquidityUsd == null
                      ? ""
                      : ` · Withdrawable ${formatUsdCompact(opportunity.withdrawLiquidityUsd)}`}
                  </span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {utilization != null ? (
                <Progress
                  mode="meter"
                  size="sm"
                  min={0}
                  max={100}
                  value={utilization * 100}
                  warnAt={0.8}
                  failAt={0.9}
                  statusLabel={utilization >= 0.9 ? "Withdrawals may wait" : "Elevated borrow demand"}
                >
                  <ProgressLabel>Utilization</ProgressLabel>
                  <ProgressValue />
                </Progress>
              ) : null}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="type-heading tabular-nums">{formatPercent(row.netApyAfterCost)} net APY</p>
                  <p className="type-body-sm text-text-2 tabular-nums">
                    Base {formatPercent(opportunity.baseApy)} + counted rewards {formatPercent(countedReward)}
                    {row.rewardHaircut < 1 ? (
                      <>
                        {" "}
                        <s>{formatPercent(opportunity.headlineApy)} headline</s>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="text-end">
                  <p className="type-body tabular-nums">
                    {formatSignedUsd(row.netReturnUsd)} over {horizonLabel(row.holdingDays)}
                  </p>
                  <p className="type-body-sm text-text-2 tabular-nums">
                    {formatSignedUsd(row.incrementalGainVsCurrentUsd)} versus {currentName}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">{breakEvenBadge(row)}</div>
              <RiskBadgeList signals={opportunity.riskFlags} />
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm" onClick={() => onInspect(row)}>
                Inspect formula
              </Button>
              {row.isCurrentPosition ? null : (
                <Button size="sm" disabled={blocked || !canFund} onClick={() => onAct(row)}>
                  {blocked ? "Not enough liquidity" : actionLabel}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
