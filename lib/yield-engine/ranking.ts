import type {
  EvaluatedOpportunity,
  HoldingHorizonDays,
  YieldOpportunity,
} from "@/types/flume";
import { evaluateOpportunity } from "@/lib/yield-engine/calculator";
import { evaluateRisk } from "@/lib/yield-engine/risk-evaluator";

export interface RankInput {
  opportunities: YieldOpportunity[];
  currentId: string | null;
  principalUsd: number;
  holdingDays: HoldingHorizonDays;
  rewardHaircut: number;
}

export function rankOpportunities(input: RankInput): EvaluatedOpportunity[] {
  const current =
    input.opportunities.find((item) => item.id === input.currentId) ?? null;

  const evaluated = input.opportunities.map((opportunity) => {
    const withRisk: YieldOpportunity = {
      ...opportunity,
      riskFlags: evaluateRisk(opportunity, input.principalUsd),
    };
    return evaluateOpportunity({
      opportunity: withRisk,
      current,
      principalUsd: input.principalUsd,
      holdingDays: input.holdingDays,
      rewardHaircut: input.rewardHaircut,
    });
  });

  return evaluated.sort((a, b) => b.netReturnUsd - a.netReturnUsd);
}
