'use client';

import { useQuery } from '@tanstack/react-query';
import { NetworkCluster, YieldOpportunity } from '@/types/flume';

interface OpportunitiesResponse {
  opportunities: YieldOpportunity[];
  cluster: NetworkCluster;
  devnet: boolean;
  updatedAt: number;
}

export function useOpportunities() {
  return useQuery<OpportunitiesResponse>({
    queryKey: ['flume-opportunities'],
    queryFn: async () => {
      const res = await fetch('/api/opportunities');
      if (!res.ok) {
        throw new Error('Failed to fetch yield opportunities');
      }
      return res.json();
    },
    refetchInterval: 45_000,
    staleTime: 20_000,
  });
}