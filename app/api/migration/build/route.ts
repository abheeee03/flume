import { loadOpportunities } from "@/lib/yield-engine/opportunities";
import { buildMigrationTransaction } from "@/lib/migration/build-transaction";
import type { MigrationBuildRequest } from "@/types/flume";

export async function POST(request: Request) {
  let body: Partial<MigrationBuildRequest>;
  try {
    body = (await request.json()) as Partial<MigrationBuildRequest>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (
    typeof body.owner !== "string" ||
    typeof body.sourceOpportunityId !== "string" ||
    typeof body.destinationOpportunityId !== "string" ||
    typeof body.amountUsdc !== "number" ||
    typeof body.minimumDestinationUsdc !== "number"
  ) {
    return Response.json({ error: "Migration request is missing a field." }, { status: 400 });
  }

  try {
    const markets = await loadOpportunities();
    const built = await buildMigrationTransaction(
      {
        owner: body.owner,
        sourceOpportunityId: body.sourceOpportunityId,
        destinationOpportunityId: body.destinationOpportunityId,
        amountUsdc: body.amountUsdc,
        minimumDestinationUsdc: body.minimumDestinationUsdc,
      },
      markets.opportunities,
    );
    return Response.json(built);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the migration.";
    const status = /Unknown|invalid|same market|minimum-output|Amount|Owner/i.test(message)
      ? 400
      : 502;
    return Response.json({ error: message }, { status });
  }
}
