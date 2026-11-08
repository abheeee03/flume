'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveUsdcMint } from '@/config/markets';
import { NetworkCluster, UserPosition } from '@/types/flume';

interface PositionsApiResponse {
  wallet: string;
  cluster: NetworkCluster;
  devnet: boolean;
  usdcMint: string;
  vybeConnected: boolean;
  solWalletBalance: number;
  usdcWalletBalance: number;
  balancesAvailable: boolean;
  balanceError: string | null;
  positions: UserPosition[];
  updatedAt: number;
}

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
    refetchInterval: 15_000,
  });

  const activePositions = (query.data?.positions ?? []).filter(
    (position) => position.source !== 'wallet_usdc' && position.depositedUsdc > 0
  );
  const balancesAvailable = query.data?.balancesAvailable ?? false;
  const solWalletBalance = balancesAvailable
    ? (query.data?.solWalletBalance ?? 0)
    : 0;
  const usdcWalletBalance = balancesAvailable
    ? (query.data?.usdcWalletBalance ?? 0)
    : 0;
  const primaryPosition = activePositions[0] ?? null;

  return {
    ...query,
    connected,
    walletAddress,
    positions: activePositions,
    primaryPosition,
    solWalletBalance,
    usdcWalletBalance,
    balancesAvailable,
    balanceError: query.data?.balanceError ?? null,
    usdcMint: query.data?.usdcMint ?? getActiveUsdcMint(),
    vybeConnected: query.data?.vybeConnected ?? false,
  };
}
