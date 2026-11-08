"use client";

import { useState } from "react";
import { useYieldComparison } from "@/hooks/useYieldComparison";
import { useMigration } from "@/hooks/useMigration";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePositions } from "@/hooks/usePositions";
import { DisclosureBanner } from "@/components/layout/DisclosureBanner";
import { Navbar } from "@/components/layout/Navbar";
import { YieldControlsBar } from "@/components/controls/YieldControlsBar";
import { FormulaBreakdownModal } from "@/components/opportunities/FormulaBreakdownModal";
import { OpportunityCardList } from "@/components/opportunities/OpportunityCardList";
import { MigrationPreviewDrawer } from "@/components/migration/MigrationPreviewDrawer";
import { MigrationSuccessModal } from "@/components/migration/MigrationSuccessModal";
import { ActivePositionsBar } from "@/components/positions/ActivePositionsBar";
import type { EvaluatedOpportunity } from "@/types/flume";
import { Alert, AlertDescription, AlertTitle } from "@/components/glaze/ui/alert";

export function Dashboard() {
  const opportunitiesQuery = useOpportunities();
  const opportunities = opportunitiesQuery.data?.opportunities;
  const positionState = usePositions(opportunities);
  const current = positionState.positions[0] ?? null;
  const comparison = useYieldComparison(
    opportunities,
    current?.opportunityId ?? null,
    current?.depositedUsdc ?? 5_000,
  );
  const migration = useMigration({
    source: current,
    onConfirmed: () => {
      void positionState.refetch();
    },
  });
  const [formula, setFormula] = useState<EvaluatedOpportunity | null>(null);
  const currentName = current ? current.protocol : "cash";
  const canSign = Boolean(current && !current.preview && !positionState.preview);

  return (
    <main className="mx-auto flex w-full max-w-measure flex-col gap-6 px-4 py-6">
      <DisclosureBanner source={opportunitiesQuery.data?.dataSource} />
      <Navbar highlightSeed={!positionState.preview && !positionState.isLoading && positionState.positions.length === 0} onMinted={() => void positionState.refetch()} />
      {opportunitiesQuery.isError ? (
        <Alert status="fail">
          <AlertTitle>Yield feed failed</AlertTitle>
          <AlertDescription>Reload the page to try the markets again.</AlertDescription>
        </Alert>
      ) : null}
      <ActivePositionsBar
        positions={positionState.positions}
        loading={positionState.isLoading}
        usdc={positionState.usdc}
        rewardHaircut={comparison.rewardHaircut}
        opportunities={opportunities}
      />
      <YieldControlsBar
        principalUsd={comparison.principalUsd}
        onPrincipal={comparison.setPrincipalUsd}
        holdingDays={comparison.holdingDays}
        onHoldingDays={comparison.setHoldingDays}
        rewardHaircut={comparison.rewardHaircut}
        onRewardHaircut={comparison.setRewardHaircut}
      />
      <section className="flex flex-col gap-3">
        <h2 className="type-heading">Markets by net return</h2>
        <OpportunityCardList
          rows={comparison.ranked}
          loading={opportunitiesQuery.isLoading}
          currentName={currentName}
          onInspect={setFormula}
          onMigrate={(row) => {
            void migration.openPreview(row);
          }}
        />
      </section>
      <FormulaBreakdownModal
        row={formula}
        currentName={currentName}
        onOpenChange={(open) => {
          if (!open) setFormula(null);
        }}
      />
      <MigrationPreviewDrawer
        row={migration.target}
        sourceName={currentName}
        built={migration.built}
        simulation={migration.simulation}
        pending={migration.pending}
        error={migration.error}
        canSign={canSign}
        onOpenChange={(open) => {
          if (!open) migration.closePreview();
        }}
        onExecute={migration.execute}
      />
      <MigrationSuccessModal
        signature={migration.signature}
        onOpenChange={(open) => {
          if (!open) migration.dismissReceipt();
        }}
      />
    </main>
  );
}
