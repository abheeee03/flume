"use client";

import { MAX_PRINCIPAL_USD, MIN_PRINCIPAL_USD } from "@/config/markets";
import { formatUsd } from "@/lib/format";
import type { HoldingHorizonDays } from "@/types/flume";
import { Chip, ChipGroup } from "@/components/glaze/ui/chip";
import { Field, FieldDescription, FieldLabel } from "@/components/glaze/ui/field";
import { NumberInput } from "@/components/glaze/ui/number-input";
import { SegmentedControl, SegmentedControlItem } from "@/components/glaze/ui/segmented-control";
import { Slider } from "@/components/glaze/ui/slider";

const HORIZONS: HoldingHorizonDays[] = [7, 30, 90, 365];
const PRESETS = [10, 20, 100, 1_000];

export function YieldControlsBar({
  purpose,
  principalUsd,
  onPrincipal,
  holdingDays,
  onHoldingDays,
  rewardHaircut,
  onRewardHaircut,
  walletUsdc,
}: {
  purpose: "invest" | "move";
  principalUsd: number;
  onPrincipal: (value: number) => void;
  holdingDays: HoldingHorizonDays;
  onHoldingDays: (value: HoldingHorizonDays) => void;
  rewardHaircut: number;
  onRewardHaircut: (value: number) => void;
  walletUsdc?: number;
}) {
  const haircutPercent = Math.round(rewardHaircut * 100);
  const presets = Array.from(
    new Set(
      walletUsdc && walletUsdc > 0
        ? [...PRESETS, Number(walletUsdc.toFixed(2))]
        : PRESETS,
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{purpose === "invest" ? "Amount to invest" : "Amount to move"}</FieldLabel>
        <NumberInput
          aria-label={purpose === "invest" ? "Amount to invest in USDC" : "Amount to move in USDC"}
          value={principalUsd}
          min={MIN_PRINCIPAL_USD}
          max={MAX_PRINCIPAL_USD}
          step={1}
          unit="USDC"
          onValueChange={(value) => {
            if (value != null) onPrincipal(value);
          }}
        />
        <FieldDescription>
          Between {formatUsd(MIN_PRINCIPAL_USD)} and {formatUsd(MAX_PRINCIPAL_USD)}.
        </FieldDescription>
      </Field>
      <ChipGroup>
        {presets.map((preset) => (
          <Chip
            key={preset}
            pressed={principalUsd === preset}
            onPressedChange={(pressed) => {
              if (pressed) onPrincipal(preset);
            }}
          >
            {formatUsd(preset)}
          </Chip>
        ))}
      </ChipGroup>
      <Field>
        <FieldLabel>Holding period</FieldLabel>
        <SegmentedControl
          value={String(holdingDays)}
          onValueChange={(value) => onHoldingDays(Number(value) as HoldingHorizonDays)}
        >
          {HORIZONS.map((days) => (
            <SegmentedControlItem key={days} value={String(days)} aria-label={`${days} days`}>
              {days} days
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Field>
      <Field>
        <FieldLabel>Reward haircut</FieldLabel>
        <Slider
          aria-label="Reward haircut"
          min={0}
          max={100}
          step={1}
          value={[haircutPercent]}
          showValue
          format={{ maximumFractionDigits: 0 }}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") onRewardHaircut(next / 100);
          }}
        />
        <FieldDescription>
          Counts {haircutPercent}% of token incentives toward net return.
        </FieldDescription>
      </Field>
    </div>
  );
}
