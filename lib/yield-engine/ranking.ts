import {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  UserPosition,
  YieldOpportunity,
} from '@/types/flume';
import { evaluateOpportunity } from './calculator';

export function rankOpportunities(params: {
  opportunities: YieldOpportunity[];
  currentPosition: UserPosition | null;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  rewardHaircut: number;
}): EvaluatedOpportunity[] {
  const {
    opportunities,
    currentPosition,
    principalUsd,
    holdingDays,
    rewardHaircut,
  } = params;

  const sourceOpportunity =
    opportunities.find((o) => o.id === currentPosition?.opportunityId) ??
    null;

  const evaluated = opportunities.map((opportunity) =>
    evaluateOpportunity({
      opportunity,
      currentPosition,
      sourceOpportunity,
      principalUsd,
      holdingDays,
      rewardHaircut,
    })
  );

  // Strictly sort by netReturnUsd descending (never raw headline APY)
  return evaluated.sort((a, b) => b.netReturnUsd - a.netReturnUsd);
}