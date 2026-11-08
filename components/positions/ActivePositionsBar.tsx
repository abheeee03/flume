"use client";

import { formatPercent, formatUsd } from "@/lib/format";
import type { UserPosition } from "@/types/flume";
import { Badge } from "@/components/glaze/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";

export function ActivePositionsBar({
  position,
  usdcWalletBalance: _usdcWalletBalance,
  onInvestWalletUsdc: _onInvestWalletUsdc,
}: {
  position: UserPosition;
  usdcWalletBalance?: number;
  onInvestWalletUsdc?: () => void;
}) {
  return (
    <Card className="border-line-strong">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="type-heading-sm">Your Position</CardTitle>
          <Badge variant="ok">Active</Badge>
        </div>
        <CardDescription>
          {position.protocol} {position.market}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 pt-0">
        <div className="flex flex-col gap-0.5 rounded-panel border border-line-faint bg-field p-2.5">
          <span className="type-caption text-text-3">Deposited Principal</span>
          <span className="type-heading-sm tabular-nums text-text-1">
            {formatUsd(position.depositedUsdc)} USDC
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-panel border border-line-faint bg-field p-2">
            <span className="type-caption text-text-3">Base APY</span>
            <span className="type-body-sm font-medium tabular-nums text-text-1">
              {formatPercent(position.currentBaseApy)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-panel border border-line-faint bg-field p-2">
            <span className="type-caption text-text-3">Reward APY</span>
            <span className="type-body-sm font-medium tabular-nums text-text-1">
              {formatPercent(position.currentRewardApy)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
