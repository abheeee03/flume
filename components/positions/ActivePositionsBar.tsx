"use client";

import { formatPercent, formatUsd } from "@/lib/format";
import type { UserPosition } from "@/types/flume";
import { Badge } from "@/components/glaze/ui/badge";
import { Button } from "@/components/glaze/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardMeta, CardTitle } from "@/components/glaze/ui/card";

export function ActivePositionsBar({
  position,
  usdcWalletBalance,
  onUseWalletUsdc,
}: {
  position: UserPosition;
  usdcWalletBalance: number;
  onUseWalletUsdc?: (amount: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {position.protocol} {position.market}
        </CardTitle>
        <CardDescription>
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant="ok">Open deposit</Badge>
            <span className="tabular-nums">{formatUsd(position.depositedUsdc)} USDC</span>
            <span>
              Base {formatPercent(position.currentBaseApy)}, rewards {formatPercent(position.currentRewardApy)}
            </span>
          </span>
        </CardDescription>
      </CardHeader>
      {usdcWalletBalance > 0 && onUseWalletUsdc ? (
        <CardFooter>
          <CardMeta>Wallet still holds liquid USDC</CardMeta>
          <Button variant="secondary" size="sm" onClick={() => onUseWalletUsdc(usdcWalletBalance)}>
            Size the move to {formatUsd(usdcWalletBalance)}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
