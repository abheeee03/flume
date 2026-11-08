"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpportunitiesResponse } from "@/types/flume";

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: async (): Promise<OpportunitiesResponse> => {
      const response = await fetch("/api/opportunities");
      if (!response.ok) throw new Error("Could not load yield markets.");
      return response.json() as Promise<OpportunitiesResponse>;
    },
    refetchInterval: 30_000,
  });
}
