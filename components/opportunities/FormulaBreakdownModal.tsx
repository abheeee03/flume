"use client";

import { formatDays, formatFeeUsd, formatPercent, formatUsd, horizonLabel } from "@/lib/format";
import type { EvaluatedOpportunity } from "@/types/flume";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import { DialogClose } from "@/components/glaze/ui/dialog";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/glaze/ui/data-list";

export function FormulaBreakdownModal({
  row,
  currentName,
  onOpenChange,
}: {
  row: EvaluatedOpportunity | null;
  currentName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const costs = row?.costs;

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Net return formula</DialogTitle>
          <DialogDescription>
            {row
              ? `${row.opportunity.protocol} ${row.opportunity.market}, over ${horizonLabel(row.holdingDays)}.`
              : "Select a market."}
          </DialogDescription>
        </DialogHeader>
        {row && costs ? (
          <DialogBody>
            <DataList>
              <DataListItem>
                <DataListLabel>Holding years</DataListLabel>
                <DataListValue>
                  {row.holdingDays} / 365 = {row.holdingYears.toFixed(4)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Effective APY</DataListLabel>
                <DataListValue>
                  {formatPercent(row.opportunity.baseApy)} + {formatPercent(row.opportunity.rewardApy)} ×{" "}
                  {Math.round(row.rewardHaircut * 100)}% = {formatPercent(row.effectiveApy)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Withdrawal fee</DataListLabel>
                <DataListValue>{formatFeeUsd(costs.sourceWithdrawalFeeUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Deposit fee</DataListLabel>
                <DataListValue>{formatFeeUsd(costs.destinationDepositFeeUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Network fees</DataListLabel>
                <DataListValue>
                  {formatFeeUsd(costs.solanaBaseFeeUsd + costs.priorityFeeUsd)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>One-time cost</DataListLabel>
                <DataListValue>{formatFeeUsd(costs.totalOneTimeCostUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Gross return</DataListLabel>
                <DataListValue>
                  {formatUsd(row.principalUsd)} × {formatPercent(row.effectiveApy)} × {row.holdingYears.toFixed(4)} ={" "}
                  {formatUsd(row.grossReturnUsd)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Net return</DataListLabel>
                <DataListValue>
                  {formatUsd(row.grossReturnUsd)} − {formatUsd(costs.totalOneTimeCostUsd)} = {formatUsd(row.netReturnUsd)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Net APY after cost</DataListLabel>
                <DataListValue>{formatPercent(row.netApyAfterCost)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Versus {currentName}</DataListLabel>
                <DataListValue>{formatUsd(row.incrementalGainVsCurrentUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Break-even</DataListLabel>
                <DataListValue>
                  {row.breakEvenStatus === "instant"
                    ? "Breaks even immediately"
                    : row.breakEvenDays == null
                      ? "Does not break even against the current position"
                      : row.breakEvenStatus === "current"
                        ? "Already in this market, so the cost is zero"
                        : formatDays(row.breakEvenDays)}
                </DataListValue>
              </DataListItem>
            </DataList>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <DialogClose>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
