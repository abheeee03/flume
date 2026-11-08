"use client";

import type { HoldingHorizonDays } from "@/types/flume";
import { Field, FieldDescription, FieldLabel } from "@/components/glaze/ui/field";
import { SegmentedControl, SegmentedControlItem } from "@/components/glaze/ui/segmented-control";
import { Slider } from "@/components/glaze/ui/slider";

const HORIZONS: HoldingHorizonDays[] = [7, 30, 90, 365];

export function YieldControlsBar({
  holdingDays,
  onHoldingDays,
  rewardHaircut,
  onRewardHaircut,
}: {
  holdingDays: HoldingHorizonDays;
  onHoldingDays: (value: HoldingHorizonDays) => void;
  rewardHaircut: number;
  onRewardHaircut: (value: number) => void;
}) {
  const haircutPercent = Math.round(rewardHaircut * 100);

  return (
    <div className="flex flex-col gap-4">
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
