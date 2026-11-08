"use client";

import { useRouter } from "next/navigation";
import { formatPercent, formatShares, formatSignedUsd, formatUsd, horizonLabel } from "@/lib/format";
import type { EvaluatedOpportunity, MigrationBuildResponse, SimulationResult, UserPosition } from "@/types/flume";
import { Alert, AlertDescription, AlertTitle } from "@/components/glaze/ui/alert";
import { Button } from "@/components/glaze/ui/button";
import { Checkbox } from "@/components/glaze/ui/checkbox";
import { Chip, ChipGroup } from "@/components/glaze/ui/chip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/glaze/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/glaze/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/glaze/ui/field";
import { SegmentedControl, SegmentedControlItem } from "@/components/glaze/ui/segmented-control";
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
import { Slider } from "@/components/glaze/ui/slider";
import { Status } from "@/components/glaze/ui/status";
import { Step, StepIndicator, StepText, StepTitle, Steps } from "@/components/glaze/ui/steps";

export function MigrationPreviewDrawer({
  row,
  mode,
  sourceName,
  amountUsdc,
  onAmountChange,
  maxAmountUsdc,
  built,
  simulation,
  pending,
  error,
  acknowledgeSlippage,
  onAcknowledgeSlippage,
  guardDetails,
  primaryPosition,
  walletPosition,
  walletUsdcAvailable,
  onSwitchSource,
  canSign,
  onOpenChange,
  onExecute,
}: {
  row: EvaluatedOpportunity | null;
  mode: "invest" | "move";
  sourceName: string;
  amountUsdc: number;
  onAmountChange: (amount: number) => void;
  maxAmountUsdc: number;
  built: MigrationBuildResponse | null;
  simulation: SimulationResult | null;
  pending: boolean;
  error: string | null;
  acknowledgeSlippage?: boolean;
  onAcknowledgeSlippage?: (checked: boolean) => void;
  guardDetails?: { expectedUsdc: number; minimumUsdc: number } | null;
  primaryPosition?: UserPosition | null;
  walletPosition?: UserPosition | null;
  walletUsdcAvailable?: number;
  onSwitchSource?: (newSource: UserPosition, maxAmount: number) => void;
  canSign: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: () => Promise<unknown>;
}) {
  const router = useRouter();
  const destination = row?.opportunity;
  const stepValue = simulation?.success ? 5 : 1;
  const maxSafeAmount = Math.max(1, Math.round(maxAmountUsdc));
  const currentAmount = Math.min(amountUsdc, maxSafeAmount);

  const isGuardError =
    Boolean(error?.toLowerCase().includes("minimum output guard")) ||
    guardDetails != null;

  return (
    <Sheet open={row != null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <SheetTitle>{mode === "invest" ? "Invest" : "Move funds"}</SheetTitle>
              <SheetDescription>
                {destination
                  ? mode === "invest"
                    ? `Invest ${formatUsd(currentAmount)} of devnet USDC into ${destination.protocol} ${destination.market}.`
                    : `Move ${formatUsd(currentAmount)} from ${sourceName} into ${destination.protocol} ${destination.market}.`
                  : "Choose a market."}
              </SheetDescription>
            </div>
            {destination ? (
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const sourceId =
                    mode === "invest"
                      ? "wallet-usdc"
                      : (primaryPosition?.opportunityId ?? "wallet-usdc");
                  const destId = destination.id;
                  router.push(
                    `/compare?source=${encodeURIComponent(sourceId)}&dest=${encodeURIComponent(
                      destId
                    )}&amount=${encodeURIComponent(currentAmount)}&days=${encodeURIComponent(
                      row.holdingDays
                    )}`
                  );
                }}
              >
                Compare ↗
              </Button>
            ) : null}
          </div>
        </SheetHeader>
        {row && destination ? (
          <SheetBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-panel border border-line-faint bg-field px-3 py-2 text-text-2 type-body-sm">
              <span className="type-caption text-text-2">
                Comparing <strong>{sourceName}</strong> vs <strong>{destination.protocol}</strong>
              </span>
              <button
                type="button"
                className="type-label-sm text-text-1 underline hover:text-text-2 cursor-pointer"
                onClick={() => {
                  const sourceId =
                    mode === "invest"
                      ? "wallet-usdc"
                      : (primaryPosition?.opportunityId ?? "wallet-usdc");
                  const destId = destination.id;
                  router.push(
                    `/compare?source=${encodeURIComponent(sourceId)}&dest=${encodeURIComponent(
                      destId
                    )}&amount=${encodeURIComponent(currentAmount)}&days=${encodeURIComponent(
                      row.holdingDays
                    )}`
                  );
                }}
              >
                Full comparison ↗
              </button>
            </div>
            {primaryPosition && walletPosition && walletUsdcAvailable && walletUsdcAvailable > 0 && onSwitchSource ? (
              <Field>
                <FieldLabel>Funding source</FieldLabel>
                <SegmentedControl
                  value={mode === "invest" ? "wallet" : "deposit"}
                  onValueChange={(val) => {
                    if (val === "wallet") {
                      onSwitchSource(walletPosition, walletUsdcAvailable);
                    } else if (val === "deposit") {
                      onSwitchSource(primaryPosition, primaryPosition.depositedUsdc);
                    }
                  }}
                >
                  <SegmentedControlItem value="deposit">
                    Move {primaryPosition.protocol} ({formatUsd(primaryPosition.depositedUsdc)})
                  </SegmentedControlItem>
                  <SegmentedControlItem value="wallet">
                    Invest wallet USDC ({formatUsd(walletUsdcAvailable)})
                  </SegmentedControlItem>
                </SegmentedControl>
              </Field>
            ) : null}

            <div className="flex flex-col gap-3 rounded-panel border border-line p-3">
              <Field>
                <FieldLabel>{mode === "invest" ? "Amount to invest" : "Amount to move"}</FieldLabel>
                <Slider
                  aria-label={mode === "invest" ? "Amount to invest in USDC" : "Amount to move in USDC"}
                  min={1}
                  max={maxSafeAmount}
                  step={1}
                  value={[currentAmount]}
                  showValue
                  format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                  onValueChange={(val) => {
                    const next = Array.isArray(val) ? val[0] : val;
                    if (typeof next === "number" && next >= 1) onAmountChange(next);
                  }}
                />
                <FieldDescription>
                  {mode === "invest"
                    ? `Available in wallet: ${formatUsd(maxAmountUsdc)} USDC`
                    : `Available in ${sourceName}: ${formatUsd(maxAmountUsdc)} USDC`}
                </FieldDescription>
              </Field>
              {maxAmountUsdc > 1 ? (
                <ChipGroup>
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const targetVal = Math.max(1, Math.round(maxAmountUsdc * ratio));
                    return (
                      <Chip
                        key={ratio}
                        pressed={currentAmount === targetVal}
                        onPressedChange={(pressed) => {
                          if (pressed) onAmountChange(targetVal);
                        }}
                      >
                        {ratio === 1 ? "Max" : `${Math.round(ratio * 100)}%`} ({formatUsd(targetVal)})
                      </Chip>
                    );
                  })}
                </ChipGroup>
              ) : null}
            </div>

            <Steps value={stepValue} size="sm" orientation="vertical">
              <Step step={1}>
                <StepIndicator />
                <StepText>
                  <StepTitle>
                    {mode === "invest" ? "Send USDC from the wallet" : `Withdraw from ${sourceName}`}
                  </StepTitle>
                </StepText>
              </Step>
              <Step step={2}>
                <StepIndicator />
                <StepText>
                  <StepTitle>
                    {mode === "invest" ? "Keep the official USDC mint" : "Receive USDC in the wallet"}
                  </StepTitle>
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
                <DataListLabel>{mode === "invest" ? "Amount" : "Gross withdrawal"}</DataListLabel>
                <DataListValue>{formatUsd(currentAmount)}</DataListValue>
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
                  {formatShares(built?.minimumDestinationUsdc ?? row.minimumDestinationUsdc)} {destination.receiptShareSymbol}
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

              {isGuardError && onAcknowledgeSlippage ? (
                <Alert status="warn">
                  <AlertTitle>Minimum output guard protection</AlertTitle>
                  <AlertDescription>
                    {guardDetails
                      ? `Expected output is ${formatUsd(guardDetails.expectedUsdc)} USDC (minimum guard was ${formatUsd(guardDetails.minimumUsdc)} USDC) after protocol withdrawal and deposit fees.`
                      : "The net output is slightly lower than the estimated minimum due to source protocol withdrawal fees."}
                  </AlertDescription>
                  <div className="mt-2.5 flex items-start gap-2.5 pt-2 border-t border-line-faint">
                    <Checkbox
                      id="safety-acknowledge"
                      checked={acknowledgeSlippage || false}
                      onCheckedChange={(checked) => onAcknowledgeSlippage(Boolean(checked))}
                    />
                    <label
                      htmlFor="safety-acknowledge"
                      className="type-body-sm text-text-1 cursor-pointer select-none"
                    >
                      I understand and accept {formatUsd(guardDetails?.expectedUsdc ?? built?.netMigratedUsdc ?? row.expectedDestinationUsdc)} USDC net output. Proceed with migration.
                    </label>
                  </div>
                </Alert>
              ) : null}

              {simulation && !simulation.success && !isGuardError ? (
                <Status status="fail">{simulation.error ?? "Simulation failed."}</Status>
              ) : null}
              {error && !isGuardError ? <Status status="fail">{error}</Status> : null}
              {!canSign && !error ? (
                <p className="type-body-sm text-text-2">
                  Connect a devnet wallet that holds official USDC to simulate and sign.
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
              Net APY after this {mode === "invest" ? "investment" : "move"} is {formatPercent(row.netApyAfterCost)}.
              Every instruction runs in one Solana transaction. If any step fails, none of them land.
            </p>
          </SheetBody>
        ) : null}
        <SheetFooter>
          <SheetClose>Close</SheetClose>
          <SheetAction
            variant="confirm"
            disabled={
              !canSign ||
              pending ||
              (simulation?.success !== true && !(isGuardError && acknowledgeSlippage && simulation?.success))
            }
            onAction={onExecute}
          >
            {mode === "invest" ? `Sign and invest ${formatUsd(currentAmount)}` : `Sign and move ${formatUsd(currentAmount)}`}
          </SheetAction>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
