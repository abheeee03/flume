'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveCluster } from '@/config/markets';
import { NetworkCluster, UserPosition } from '@/types/flume';

interface PositionsApiResponse {
  wallet: string;
  cluster: NetworkCluster;
  devnet: boolean;
  vybeConnected: boolean;
  usdcWalletBalance: number;
  positions: UserPosition[];
  updatedAt: number;
}

const PREVIEW_DEFAULT_POSITION: UserPosition = {
  opportunityId: 'save-main-usdc',
  protocol: 'Save (Solend)',
  market: 'Main Pool USDC',
  depositedUsdc: 5000,
  rawShares: '5000000000',
  shareMintAddress: 'flSAVE',
  programId: 'ALend7Ketfx5bxh6ghsCDXAoDrhvEmsXT3cynB6aPLgx',
  marketAddress: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
  currentBaseApy: 0.052,
  currentRewardApy: 0.002,
  source: 'hybrid',
  network: getActiveCluster(),
  lastRefreshedAt: Date.now(),
};

export function usePositions() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const query = useQuery<PositionsApiResponse>({
    queryKey: ['flume-positions', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/positions?wallet=${walletAddress}`);
      if (!res.ok) {
        throw new Error('Failed to load positions');
      }
      return res.json();
    },
    enabled: Boolean(connected && walletAddress),
    refetchInterval: 20_000,
  });

  const activePositions = query.data?.positions ?? [];
  const primaryPosition: UserPosition =
    activePositions[0] ?? PREVIEW_DEFAULT_POSITION;

  return {
    ...query,
    connected,
    walletAddress,
    positions: activePositions,
    primaryPosition,
    isSimulatedPreview: !connected || activePositions.length === 0,
    usdcWalletBalance: query.data?.usdcWalletBalance ?? 0,
    vybeConnected: query.data?.vybeConnected ?? false,
  };
}