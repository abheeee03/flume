'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePositions } from '@/hooks/usePositions';
import { useYieldComparison } from '@/hooks/useYieldComparison';
import { useMigration } from '@/hooks/useMigration';
import { getExplorerTxUrl } from '@/lib/solana/connection';
import {
  EvaluatedOpportunity,
  HoldingHorizonDays,
} from '@/types/flume';

export function Dashboard() {
  const { publicKey, connected } = useWallet();
  const queryClient = useQueryClient();

  const [principalUsd, setPrincipalUsd] = useState<number>(5000);
  const [holdingDays, setHoldingDays] = useState<HoldingHorizonDays>(90);
  const [rewardHaircutPct, setRewardHaircutPct] = useState<number>(50);
  const [faucetLoading, setFaucetLoading] = useState<string | null>(null);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);
  const [inspectedFormula, setInspectedFormula] =
    useState<EvaluatedOpportunity | null>(null);

  const {
    data: oppData,
    isLoading: oppLoading,
    refetch: refetchOpps,
  } = useOpportunities();

  const {
    primaryPosition,
    isSimulatedPreview,
    usdcWalletBalance,
    vybeConnected,
    refetch: refetchPositions,
  } = usePositions();

  const rankedOpportunities = useYieldComparison({
    opportunities: oppData?.opportunities ?? [],
    currentPosition: primaryPosition,
    principalUsd,
    holdingDays,
    rewardHaircut: rewardHaircutPct / 100,
  });

  const migration = useMigration();
  const isDevnet = oppData?.devnet ?? true;
  const clusterLabel = isDevnet ? 'DEVNET MODE' : 'MAINNET MODE';

  async function handleFaucet(
    action: 'mint_usdc' | 'seed_save_position' | 'seed_kamino_position'
  ) {
    if (!publicKey) return;
    setFaucetLoading(action);
    setFaucetMessage(null);
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Faucet error');

      setFaucetMessage(
        `Minted ${data.amountUi.toLocaleString()} ${data.symbol} on Devnet!`
      );
      await queryClient.invalidateQueries({ queryKey: ['flume-positions'] });
    } catch (err: unknown) {
      setFaucetMessage(
        err instanceof Error ? err.message : 'Faucet request failed'
      );
    } finally {
      setFaucetLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Disclosure & Environment Strip */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                isDevnet
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {clusterLabel} (DEVNET={String(isDevnet)})
            </span>
            <span>
              Yields fetched live from Mainnet (DefiLlama + Kamino + Meteora).
              Positions synced via{' '}
              <strong className="text-white">Vybe Network API</strong> + Solana
              RPC.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>
              Kamino: KLend2g3c...avgmjD
            </span>
            <a
              href="https://devnet.meteora.ag/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              Meteora Devnet <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                FL
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  FLUME
                </h1>
                <p className="text-xs text-slate-400">
                  Deterministic Net-Yield Router & Atomic Migration Engine
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isDevnet && connected && (
              <>
                <button
                  onClick={() => handleFaucet('mint_usdc')}
                  disabled={Boolean(faucetLoading)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {faucetLoading === 'mint_usdc' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Coins className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  Mint $10k Devnet USDC
                </button>

                <button
                  onClick={() => handleFaucet('seed_save_position')}
                  disabled={Boolean(faucetLoading)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {faucetLoading === 'seed_save_position' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  Seed $5k Position (flSAVE)
                </button>
              </>
            )}

            <WalletMultiButton />
          </div>
        </div>

        {faucetMessage && (
          <div className="mx-auto max-w-7xl px-4 pb-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 font-mono">
              {faucetMessage}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Active Position Bar */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  Active Yield Position
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                  {isSimulatedPreview
                    ? 'Preview Baseline (Connect Wallet or Seed on Devnet)'
                    : `Synced via ${primaryPosition.source.toUpperCase()}`}
                </span>
                {vybeConnected && (
                  <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                    Vybe API Active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-baseline gap-4">
                <h2 className="text-xl font-bold text-white">
                  {primaryPosition.protocol} — {primaryPosition.market}
                </h2>
                <span className="font-mono text-lg font-semibold text-emerald-400">
                  ${primaryPosition.depositedUsdc.toLocaleString()} USDC
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Base APY: {(primaryPosition.currentBaseApy * 100).toFixed(2)}%
                  {' | '}Reward APY:{' '}
                  {(primaryPosition.currentRewardApy * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              {connected && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <span className="text-slate-400">Liquid USDC: </span>
                  <span className="text-white font-semibold">
                    ${usdcWalletBalance.toLocaleString()}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  refetchOpps();
                  refetchPositions();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Controls Bar */}
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-3">
          {/* Principal Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              Capital to Route (USDC)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={100}
                max={1000000}
                value={principalUsd}
                onChange={(e) =>
                  setPrincipalUsd(Math.max(0, Number(e.target.value)))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setPrincipalUsd(amt)}
                  className={`rounded px-2 py-1 font-mono text-xs ${
                    principalUsd === amt
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Holding Horizon */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              Holding Horizon (Amortizes Entry/Exit Fees)
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-slate-950 p-1 border border-slate-800">
              {([7, 30, 90, 365] as HoldingHorizonDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setHoldingDays(days)}
                  className={`rounded-md py-2 font-mono text-xs font-medium transition ${
                    holdingDays === days
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Short horizons penalize vaults with withdrawal/deposit bps fees.
            </p>
          </div>

          {/* Reward Haircut Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-400">
                Incentive Token Trust (Reward Haircut)
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                {rewardHaircutPct}% Counted
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={rewardHaircutPct}
              onChange={(e) => setRewardHaircutPct(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              Counts {rewardHaircutPct}% of volatile emission token APY toward
              Net Return.
            </p>
          </div>
        </section>

        {/* Ranked Opportunities List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Ranked by Net USD Return over {holdingDays} Days
            </h3>
            <span className="font-mono text-xs text-slate-400">
              Showing {rankedOpportunities.length} verified Solana USDC markets
            </span>
          </div>

          {oppLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {rankedOpportunities.map((item, idx) => {
                const { opportunity } = item;
                const addr = opportunity.activeAddresses;

                return (
                  <div
                    key={opportunity.id}
                    className={`rounded-xl border p-4 transition ${
                      idx === 0 && !item.isCurrentPosition
                        ? 'border-emerald-500/50 bg-slate-900/90 shadow-lg shadow-emerald-950/20'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                      {/* Protocol & Address Metadata */}
                      <div className="space-y-1.5 lg:col-span-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 font-mono text-xs font-bold text-emerald-400">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white">
                            {opportunity.protocol}
                          </span>
                          <span className="text-sm text-slate-300">
                            {opportunity.market}
                          </span>
                          {item.isCurrentPosition && (
                            <span className="rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                              CURRENT
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
                          <span>
                            TVL:{' '}
                            {opportunity.tvlUsd
                              ? `$${(opportunity.tvlUsd / 1_000_000).toFixed(1)}M`
                              : 'N/A'}
                          </span>
                          <span>
                            Util:{' '}
                            {opportunity.utilization !== null
                              ? `${Math.round(opportunity.utilization * 100)}%`
                              : 'N/A'}
                          </span>
                          <span>
                            Share: {opportunity.receiptShareSymbol}
                          </span>
                        </div>

                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          Program: {addr.programId}
                        </div>
                      </div>

                      {/* Net APY vs Headline */}
                      <div className="lg:col-span-2 font-mono">
                        <div className="text-xs text-slate-400">Net APY</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {(item.netApyAfterCost * 100).toFixed(2)}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Base {(opportunity.baseApy * 100).toFixed(2)}% + Rwd{' '}
                          {(opportunity.rewardApy * 100).toFixed(2)}%
                        </div>
                      </div>

                      {/* Net USD Return & Delta */}
                      <div className="lg:col-span-2 font-mono">
                        <div className="text-xs text-slate-400">
                          Net Return ({holdingDays}D)
                        </div>
                        <div className="text-lg font-bold text-white">
                          +${item.netReturnUsd.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span
                            className={
                              item.incrementalGainVsCurrentUsd >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {item.incrementalGainVsCurrentUsd >= 0 ? '+' : ''}
                            ${item.incrementalGainVsCurrentUsd.toFixed(2)} vs
                            current
                          </span>
                          <button
                            onClick={() => setInspectedFormula(item)}
                            className="inline-flex items-center gap-0.5 text-slate-400 underline hover:text-white"
                          >
                            <Info className="h-3 w-3" /> Math
                          </button>
                        </div>
                      </div>

                      {/* Break-Even & Risk Badges */}
                      <div className="space-y-1.5 lg:col-span-2">
                        <div>
                          {item.breakEvenStatus === 'current' && (
                            <span className="inline-block rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                              Active Position
                            </span>
                          )}
                          {(item.breakEvenStatus === 'instant' ||
                            item.breakEvenStatus === 'worth_it') && (
                            <span className="inline-block rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                              Break-even:{' '}
                              {item.breakEvenDays !== null &&
                              item.breakEvenDays < 0.1
                                ? '<0.1d (Instant)'
                                : `${item.breakEvenDays?.toFixed(1)}d`}
                            </span>
                          )}
                          {item.breakEvenStatus === 'exceeds_horizon' && (
                            <span className="inline-block rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                              Break-even: {item.breakEvenDays?.toFixed(1)}d
                              (&gt;{holdingDays}D)
                            </span>
                          )}
                          {item.breakEvenStatus === 'never_breaks_even' && (
                            <span className="inline-block rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 font-mono text-[11px] text-rose-300">
                              Lower Net Yield
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {opportunity.riskFlags.map((flag) => (
                            <span
                              key={flag.id}
                              title={flag.evidence}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                flag.severity === 'high'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : flag.severity === 'medium'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              <ShieldAlert className="h-2.5 w-2.5" />
                              {flag.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action CTA */}
                      <div className="flex justify-end lg:col-span-2">
                        <button
                          disabled={
                            item.isCurrentPosition ||
                            !item.isLiquiditySufficient
                          }
                          onClick={() =>
                            migration.openPreview(item, primaryPosition)
                          }
                          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition lg:w-auto ${
                            item.isCurrentPosition
                              ? 'border border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                              : !item.isLiquiditySufficient
                              ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300 cursor-not-allowed'
                              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          }`}
                        >
                          {item.isCurrentPosition ? (
                            'Current Pool'
                          ) : !item.isLiquiditySufficient ? (
                            'Insufficient Liquidity'
                          ) : (
                            <>
                              Preview Migration
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Formula Breakdown Modal */}
      {inspectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Net-Yield Formula Inspector —{' '}
                {inspectedFormula.opportunity.protocol}
              </h3>
              <button
                onClick={() => setInspectedFormula(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <div className="space-y-2 rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-300 border border-slate-800">
              <div>
                Principal (P): ${inspectedFormula.principalUsd.toFixed(2)}
              </div>
              <div>
                Horizon (T): {inspectedFormula.holdingDays} / 365 ={' '}
                {inspectedFormula.holdingYears.toFixed(4)} yrs
              </div>
              <div>
                Effective APY:{' '}
                {(inspectedFormula.opportunity.baseApy * 100).toFixed(2)}% + (
                {(inspectedFormula.opportunity.rewardApy * 100).toFixed(2)}% ×{' '}
                {(inspectedFormula.rewardHaircut * 100).toFixed(0)}%) ={' '}
                {(inspectedFormula.effectiveApy * 100).toFixed(2)}%
              </div>
              <div>
                Gross Return: ${inspectedFormula.grossReturnUsd.toFixed(2)}
              </div>
              <div>
                Total Migration Cost (C): $
                {inspectedFormula.costs.totalOneTimeCostUsd.toFixed(4)}
              </div>
              <div className="border-t border-slate-800 pt-2 text-emerald-400 font-bold">
                Net Return = Gross - Cost = $
                {inspectedFormula.netReturnUsd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Atomic Migration Preview & Simulation Modal */}
      {migration.selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-[11px] uppercase text-emerald-400">
                  Atomic Solana Transaction ({clusterLabel})
                </span>
                <h3 className="text-lg font-bold text-white">
                  Migrate {primaryPosition.protocol} →{' '}
                  {migration.selectedEvaluation.opportunity.protocol}
                </h3>
              </div>
              <button
                onClick={migration.closePreview}
                className="rounded-lg border border-slate-800 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Route Breakdown */}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Source Protocol:</span>
                <span className="text-white">{primaryPosition.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination Protocol:</span>
                <span className="text-emerald-400">
                  {migration.selectedEvaluation.opportunity.protocol} (
                  {migration.selectedEvaluation.opportunity.market})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Program ID:</span>
                <span className="text-slate-300 truncate max-w-[260px]">
                  {
                    migration.selectedEvaluation.opportunity.activeAddresses
                      .programId
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Principal:</span>
                <span className="text-white">
                  ${migration.selectedEvaluation.principalUsd.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Protocol + Tx Fees:</span>
                <span className="text-amber-400">
                  -$
                  {migration.selectedEvaluation.costs.totalOneTimeCostUsd.toFixed(
                    4
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-300">Expected Output Shares:</span>
                <span className="text-emerald-400 font-bold">
                  {migration.selectedEvaluation.expectedDestinationUsdc.toFixed(
                    2
                  )}{' '}
                  {
                    migration.selectedEvaluation.opportunity
                      .receiptShareSymbol
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Min Output Guard (0.05%):
                </span>
                <span className="text-slate-300">
                  {migration.selectedEvaluation.minimumDestinationUsdc.toFixed(
                    2
                  )}{' '}
                  {
                    migration.selectedEvaluation.opportunity
                      .receiptShareSymbol
                  }
                </span>
              </div>
            </div>

            {/* Simulation Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  Pre-Sign RPC Simulation
                </span>
                {migration.isBuilding && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Simulating...
                  </span>
                )}
                {migration.simulation?.success && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified ({migration.simulation.unitsConsumed.toLocaleString()}{' '}
                    CU)
                  </span>
                )}
              </div>

              {!connected && (
                <p className="text-xs text-amber-400">
                  Connect your Solana wallet in the top bar to simulate and
                  execute this atomic transaction.
                </p>
              )}

              {migration.simulation && migration.simulation.logs.length > 0 && (
                <pre className="max-h-40 overflow-y-auto rounded bg-slate-900 p-2.5 font-mono text-[10px] text-slate-400">
                  {migration.simulation.logs.join('\n')}
                </pre>
              )}

              {migration.error && (
                <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2.5 font-mono text-xs text-rose-300">
                  {migration.error}
                </div>
              )}
            </div>

            {/* Execution Receipt */}
            {migration.executionSignature ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  Atomic Migration Confirmed on {clusterLabel}!
                </div>
                <a
                  href={getExplorerTxUrl(migration.executionSignature)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-300 underline"
                >
                  View Transaction on Solana Explorer
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <button
                disabled={
                  !connected ||
                  migration.isBuilding ||
                  migration.isExecuting ||
                  !migration.builtTx
                }
                onClick={migration.executeMigration}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {migration.isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing & Confirming on Solana...
                  </>
                ) : (
                  'Sign & Execute Atomic Migration'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}