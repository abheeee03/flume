"use client";

import { formatPercent, formatShares, formatSignedUsd, formatUsd, horizonLabel } from "@/lib/format";
import type { EvaluatedOpportunity, MigrationBuildResponse, SimulationResult } from "@/types/flume";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/glaze/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/glaze/ui/data-list";
import {
  Sheet,
  SheetAction,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/glaze/ui/sheet";
import { Status } from "@/components/glaze/ui/status";
import { Step, StepIndicator, StepText, StepTitle, Steps } from "@/components/glaze/ui/steps";

export function MigrationPreviewDrawer({
  row,
  sourceName,
  built,
  simulation,
  pending,
  error,
  canSign,
  onOpenChange,
  onExecute,
}: {
  row: EvaluatedOpportunity | null;
  sourceName: string;
  built: MigrationBuildResponse | null;
  simulation: SimulationResult | null;
  pending: boolean;
  error: string | null;
  canSign: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: () => Promise<unknown>;
}) {
  const destination = row?.opportunity;
  const stepValue = simulation?.success ? 5 : 1;

  return (
    <Sheet open={row != null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Preview migration</SheetTitle>
          <SheetDescription>
            {destination
              ? `Move ${formatUsd(row.principalUsd)} from ${sourceName} into ${destination.protocol} ${destination.market}.`
              : "Choose a market."}
          </SheetDescription>
        </SheetHeader>
        {row && destination ? (
          <SheetBody className="flex flex-col gap-4">
            <Steps value={stepValue} size="sm" orientation="vertical">
              <Step step={1}>
                <StepIndicator />
                <StepText>
                  <StepTitle>Withdraw from {sourceName}</StepTitle>
                </StepText>
              </Step>
              <Step step={2}>
                <StepIndicator />
                <StepText>
                  <StepTitle>Receive USDC in the wallet</StepTitle>
                </StepText>
              </Step>
              <Step step={3}>
                <StepIndicator />
                <StepText>
                  <StepTitle>
                    Deposit into {destination.protocol} {destination.market}
                  </StepTitle>
                </StepText>
              </Step>
              <Step step={4}>
                <StepIndicator />
                <StepText>
                  <StepTitle>Verify minimum shares ({destination.receiptShareSymbol})</StepTitle>
                </StepText>
              </Step>
            </Steps>
            <DataList>
              <DataListItem>
                <DataListLabel>Gross withdrawal</DataListLabel>
                <DataListValue>{formatUsd(row.principalUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Withdrawal fee</DataListLabel>
                <DataListValue>{formatUsd(row.costs.sourceWithdrawalFeeUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Deposit fee</DataListLabel>
                <DataListValue>{formatUsd(row.costs.destinationDepositFeeUsd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Network and priority fee</DataListLabel>
                <DataListValue>
                  {formatUsd(row.costs.solanaBaseFeeUsd + row.costs.priorityFeeUsd)}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Expected receipt shares</DataListLabel>
                <DataListValue>
                  {formatShares(built?.expectedDestinationUsdc ?? row.expectedDestinationUsdc)}{" "}
                  {destination.receiptShareSymbol}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Minimum output, 0.05% guard</DataListLabel>
                <DataListValue>
                  {formatShares(row.minimumDestinationUsdc)} {destination.receiptShareSymbol}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Net gain over {horizonLabel(row.holdingDays)}</DataListLabel>
                <DataListValue>
                  {formatSignedUsd(row.netReturnUsd)} · {formatSignedUsd(row.incrementalGainVsCurrentUsd)} versus{" "}
                  {sourceName}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Break-even</DataListLabel>
                <DataListValue>
                  {row.breakEvenDays == null ? "Does not break even" : `${row.breakEvenDays.toFixed(1)} days`}
                </DataListValue>
              </DataListItem>
            </DataList>
            <div className="flex flex-col gap-2">
              {pending ? <Status status="running">Simulating</Status> : null}
              {simulation?.success ? (
                <Status status="ok">
                  Simulation verified. {simulation.unitsConsumed.toLocaleString("en-US")} compute units.
                </Status>
              ) : null}
              {simulation && !simulation.success ? (
                <Status status="fail">{simulation.error ?? "Simulation failed."}</Status>
              ) : null}
              {error ? <Status status="fail">{error}</Status> : null}
              {!canSign && !error ? (
                <p className="type-body-sm text-text-2">
                  Connect a devnet wallet with a seeded position to simulate and sign.
                </p>
              ) : null}
              {simulation ? (
                <Collapsible>
                  <CollapsibleTrigger>Raw simulation logs</CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="type-code-block whitespace-pre-wrap">
                      {simulation.logs.length ? simulation.logs.join("\n") : "No logs."}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
            <p className="type-caption text-text-3">
              Net APY after the move is {formatPercent(row.netApyAfterCost)}. Every instruction runs in one Solana
              transaction. If any step fails, none of them land.
            </p>
          </SheetBody>
        ) : null}
        <SheetFooter>
          <SheetClose>Close</SheetClose>
          <SheetAction
            variant="confirm"
            disabled={!canSign || pending || simulation?.success !== true}
            onAction={onExecute}
          >
            Sign and execute atomic migration
          </SheetAction>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
