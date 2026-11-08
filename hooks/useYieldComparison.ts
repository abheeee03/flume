"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_HORIZON_DAYS,
  DEFAULT_PRINCIPAL_USD,
  DEFAULT_REWARD_HAIRCUT,
  MAX_PRINCIPAL_USD,
  MIN_PRINCIPAL_USD,
} from "@/config/markets";
import { rankOpportunities } from "@/lib/yield-engine/ranking";
import type { HoldingHorizonDays, YieldOpportunity } from "@/types/flume";

function clampPrincipal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PRINCIPAL_USD;
  return Math.min(MAX_PRINCIPAL_USD, Math.max(MIN_PRINCIPAL_USD, value));
}

export function useYieldComparison(
  opportunities: YieldOpportunity[] | undefined,
  currentId: string | null,
  suggestedPrincipal: number,
) {
  const [principalUsd, setPrincipalUsd] = useState(DEFAULT_PRINCIPAL_USD);
  const [holdingDays, setHoldingDays] = useState<HoldingHorizonDays>(DEFAULT_HORIZON_DAYS);
  const [rewardHaircut, setRewardHaircut] = useState(DEFAULT_REWARD_HAIRCUT);
  const edited = useRef(false);

  useEffect(() => {
    if (!edited.current) setPrincipalUsd(clampPrincipal(suggestedPrincipal));
  }, [suggestedPrincipal]);

  const ranked = useMemo(() => {
    if (!opportunities?.length) return [];
    return rankOpportunities({
      opportunities,
      currentId,
      principalUsd,
      holdingDays,
      rewardHaircut,
    });
  }, [opportunities, currentId, principalUsd, holdingDays, rewardHaircut]);

  return {
    principalUsd,
    setPrincipalUsd: (value: number) => {
      edited.current = true;
      setPrincipalUsd(clampPrincipal(value));
    },
    holdingDays,
    setHoldingDays,
    rewardHaircut,
    setRewardHaircut,
    ranked,
  };
}
