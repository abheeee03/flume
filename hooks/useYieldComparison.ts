'use client';

import { useMemo } from 'react';
import { rankOpportunities } from '@/lib/yield-engine/ranking';
import {
  HoldingHorizonDays,
  UserPosition,
  YieldOpportunity,
} from '@/types/flume';

export function useYieldComparison(params: {
  opportunities: YieldOpportunity[];
  currentPosition: UserPosition | null;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  rewardHaircut: number;
}) {
  const {
    opportunities,
    currentPosition,
    principalUsd,
    holdingDays,
    rewardHaircut,
  } = params;

  return useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];
    return rankOpportunities({
      opportunities,
      currentPosition,
      principalUsd,
      holdingDays,
      rewardHaircut,
    });
  }, [
    opportunities,
    currentPosition,
    principalUsd,
    holdingDays,
    rewardHaircut,
  ]);
}