import { RiskSignal, YieldOpportunity } from '@/types/flume';

export function evaluateMarketRisks(
  market: Omit<YieldOpportunity, 'riskFlags'>,
  principalUsd: number = 5000
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (market.utilization !== null) {
    if (market.utilization >= 0.9) {
      signals.push({
        id: `${market.id}-util-high`,
        dimension: 'liquidity',
        severity: 'high',
        label: `Utilization ${Math.round(market.utilization * 100)}%: withdrawals may be delayed`,
        evidence:
          'Over 90% of supplied USDC is currently borrowed. Large withdrawals may be queued or capped until borrowers repay.',
      });
    } else if (market.utilization >= 0.8) {
      signals.push({
        id: `${market.id}-util-med`,
        dimension: 'liquidity',
        severity: 'medium',
        label: `Utilization ${Math.round(market.utilization * 100)}%: elevated borrow demand`,
        evidence: 'Pool utilization exceeds 80%.',
      });
    }
  }

  if (
    market.withdrawLiquidityUsd !== null &&
    principalUsd > market.withdrawLiquidityUsd
  ) {
    signals.push({
      id: `${market.id}-liq-cap`,
      dimension: 'liquidity',
      severity: 'high',
      label: `Available liquidity ($${market.withdrawLiquidityUsd.toLocaleString()}) below position size`,
      evidence:
        'Your position exceeds the immediately withdrawable liquidity in this pool.',
    });
  }

  const rewardShare =
    market.headlineApy > 0 ? market.rewardApy / market.headlineApy : 0;
  if (rewardShare >= 0.4) {
    signals.push({
      id: `${market.id}-incentive-heavy`,
      dimension: 'incentives',
      severity: 'high',
      label: `Incentive-heavy yield (${Math.round(rewardShare * 100)}% rewards)`,
      evidence:
        'Over 40% of headline APY is paid in volatile emission tokens rather than organic borrower interest.',
    });
  }

  if (market.strategyType === 'leveraged_looping') {
    signals.push({
      id: `${market.id}-strategy-loop`,
      dimension: 'strategy',
      severity: 'high',
      label: 'Strategy: leveraged looping',
      evidence:
        'Uses recursive borrow/lend leverage. Exposed to borrow rate spikes and liquidation thresholds.',
    });
  } else if (
    market.strategyType === 'curated_vault' ||
    market.strategyType === 'dynamic_vault'
  ) {
    signals.push({
      id: `${market.id}-strategy-vault`,
      dimension: 'strategy',
      severity: 'low',
      label:
        market.strategyType === 'dynamic_vault'
          ? 'Dynamic rebalance vault'
          : 'Curated vault allocation',
      evidence:
        'Automatically allocates across underlying lending reserves to capture optimal organic yield.',
    });
  }

  if (Date.now() - market.updatedAt > 5 * 60 * 1000) {
    signals.push({
      id: `${market.id}-stale`,
      dimension: 'freshness',
      severity: 'medium',
      label: 'Data stale: >5m old',
      evidence:
        'Market snapshot is older than 5 minutes; rates may have changed.',
    });
  }

  return signals;
}