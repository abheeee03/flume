"use client";

import { useEffect, useState } from "react";
import { effectiveApy } from "@/lib/yield-engine/calculator";
import { formatPercent, formatShares, formatUsd } from "@/lib/format";
import type { UserPosition, YieldOpportunity } from "@/types/flume";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/glaze/ui/card";
import { Badge } from "@/components/glaze/ui/badge";
import { Skeleton } from "@/components/glaze/ui/skeleton";

function ageLabel(now: number | null, at: number): string {
  if (at <= 0 || now == null) return "Waiting for a refresh";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return "Last refreshed just now";
  if (seconds < 60) return `Last refreshed ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Last refreshed ${minutes}m ago`;
}

export function ActivePositionsBar({
  positions,
  loading,
  usdc,
  rewardHaircut,
  opportunities,
}: {
  positions: UserPosition[];
  loading: boolean;
  usdc: number | null;
  rewardHaircut: number;
  opportunities: YieldOpportunity[] | undefined;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    const frame = window.requestAnimationFrame(update);
    return () => {
      window.clearInterval(timer);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>Reading devnet receipt balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No open position</CardTitle>
          <CardDescription>
            Seed a $5,000 Save position to compare it with the other USDC markets.
            {usdc != null ? ` Demo USDC in this wallet: ${formatUsd(usdc)}.` : ""}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{positions[0]?.preview ? "Preview mode" : "Open positions"}</CardTitle>
        <CardDescription>
          {positions[0]?.preview
            ? "Simulating $5,000 in the Save main pool until a wallet connects."
            : usdc != null
              ? `Demo USDC available: ${formatUsd(usdc)}.`
              : "Receipt balances read from devnet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {positions.map((position) => {
          const opportunity = opportunities?.find((row) => row.id === position.opportunityId);
          const rate = opportunity
            ? effectiveApy(opportunity, rewardHaircut)
            : position.currentBaseApy + position.currentRewardApy * rewardHaircut;
          return (
            <div key={position.opportunityId} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="type-heading-sm">
                  {position.protocol} {position.market}
                </p>
                {position.preview ? <Badge variant="outline">Simulated</Badge> : null}
              </div>
              <p className="type-body-sm text-text-2 tabular-nums">
                {formatUsd(position.depositedUsdc)} USDC
                {" · "}
                {formatShares(position.depositedUsdc)} receipt shares
                {" · "}
                Base {formatPercent(position.currentBaseApy)}
                {" · "}
                Rewards {formatPercent(position.currentRewardApy)}
                {" · "}
                After haircut {formatPercent(rate)}
              </p>
              <p className="type-caption text-text-3">
                {position.preview ? "Simulated until a wallet connects" : ageLabel(now, position.lastRefreshedAt)}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
