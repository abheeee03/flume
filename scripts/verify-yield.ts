import { getActiveCluster, getActiveUsdcMint } from '../config/markets';
import { getBaselineOpportunities } from '../lib/yield-engine/opportunities';
import { rankOpportunities } from '../lib/yield-engine/ranking';

function main() {
  const cluster = getActiveCluster();
  const usdcMint = getActiveUsdcMint();
  const opportunities = getBaselineOpportunities();

  console.log(`=== Flume Yield Engine Verification (${cluster.toUpperCase()}) ===`);
  console.log(`Active Real USDC Mint: ${usdcMint}\n`);

  const ranked90d = rankOpportunities({
    opportunities,
    currentPosition: null,
    principalUsd: 5000,
    holdingDays: 90,
    rewardHaircut: 0.5,
  });

  for (const [idx, item] of ranked90d.entries()) {
    console.log(
      `#${idx + 1} ${item.opportunity.protocol} (${item.opportunity.market}) | ` +
        `Program: ${item.opportunity.activeAddresses.programId} | ` +
        `Net APY: ${(item.netApyAfterCost * 100).toFixed(2)}% | ` +
        `Net 90D Return: $${item.netReturnUsd.toFixed(2)} | ` +
        `Liquidity OK: ${item.isLiquiditySufficient}`
    );
  }
}

main();