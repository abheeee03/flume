import { MARKETS, snapshotOpportunity } from "../config/markets";
import { rankOpportunities } from "../lib/yield-engine/ranking";
import type { HoldingHorizonDays, YieldOpportunity } from "../types/flume";

const opportunities: YieldOpportunity[] = MARKETS.map((market) => ({
  ...snapshotOpportunity(market, Date.now()),
  riskFlags: [],
}));

function print(label: string, days: HoldingHorizonDays, haircut: number, principal: number) {
  const ranked = rankOpportunities({
    opportunities,
    currentId: "save-main-usdc",
    principalUsd: principal,
    holdingDays: days,
    rewardHaircut: haircut,
  });
  console.log(`\n${label}`);
  for (const [index, row] of ranked.entries()) {
    const loopFlag = row.opportunity.riskFlags.some((flag) =>
      flag.id.endsWith("liquidity-shortfall"),
    );
    console.log(
      [
        String(index + 1).padStart(2),
        row.opportunity.id.padEnd(24),
        `net $${row.netReturnUsd.toFixed(2)}`.padEnd(16),
        `apy ${(row.netApyAfterCost * 100).toFixed(2)}%`.padEnd(12),
        row.breakEvenStatus.padEnd(18),
        loopFlag ? "LIQUIDITY" : "",
      ].join(" "),
    );
  }
}

print("90d haircut 50% $5,000", 90, 0.5, 5_000);
print("7d haircut 50% $5,000", 7, 0.5, 5_000);
print("90d haircut 0% $5,000", 90, 0, 5_000);
print("90d haircut 100% $5,000", 90, 1, 5_000);
print("90d haircut 50% $3,000", 90, 0.5, 3_000);

const ranked = rankOpportunities({
  opportunities,
  currentId: "save-main-usdc",
  principalUsd: 5_000,
  holdingDays: 90,
  rewardHaircut: 0.5,
});
const byId = Object.fromEntries(ranked.map((row) => [row.opportunity.id, row]));
const kamino = byId["kamino-main-usdc"];
const loop = byId["kamino-jlp-loop-usdc"];
const drift = byId["drift-earn-usdc"];
const marginfi = byId["marginfi-main-usdc"];
const week = rankOpportunities({
  opportunities,
  currentId: "save-main-usdc",
  principalUsd: 5_000,
  holdingDays: 7,
  rewardHaircut: 0.5,
});
const weekById = Object.fromEntries(week.map((row) => [row.opportunity.id, row]));

const failures: string[] = [];
if (!(kamino.netReturnUsd > loop.netReturnUsd)) {
  failures.push("kamino should beat the loop after a 50% haircut");
}
if (!(drift.netReturnUsd > marginfi.netReturnUsd)) {
  failures.push("drift should beat marginfi over 90 days");
}
if (!(weekById["marginfi-main-usdc"].netReturnUsd > weekById["drift-earn-usdc"].netReturnUsd)) {
  failures.push("marginfi should beat drift over 7 days");
}
if (loop.isLiquiditySufficient) {
  failures.push("loop should be liquidity constrained at $5,000");
}
const small = rankOpportunities({
  opportunities,
  currentId: "save-main-usdc",
  principalUsd: 3_000,
  holdingDays: 90,
  rewardHaircut: 0.5,
});
const smallLoop = small.find((row) => row.opportunity.id === "kamino-jlp-loop-usdc");
if (!smallLoop?.isLiquiditySufficient) {
  failures.push("loop should have enough liquidity at $3,000");
}
if (Math.abs(loop.costs.totalOneTimeCostUsd - 12.4955) > 0.02) {
  failures.push(
    `loop one-time cost should be about $12.50, got ${loop.costs.totalOneTimeCostUsd}`,
  );
}

if (failures.length) {
  console.error("\nFAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("\nRanking scenarios passed.");
