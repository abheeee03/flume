import { connection } from "next/server";
import { loadOpportunities } from "@/lib/yield-engine/opportunities";
import type { OpportunitiesResponse } from "@/types/flume";

const LIVE_TTL_MS = 60_000;
const FALLBACK_TTL_MS = 15_000;

let cache: { expiresAt: number; body: OpportunitiesResponse } | null = null;

export async function GET() {
  await connection();
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return Response.json(cache.body);
  }

  const body = await loadOpportunities(now);
  const ttl = body.dataSource === "fallback_snapshot" ? FALLBACK_TTL_MS : LIVE_TTL_MS;
  cache = { expiresAt: now + ttl, body };
  return Response.json(body);
}
