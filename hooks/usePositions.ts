"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync, AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MARKETS, PREVIEW_POSITION_ID } from "@/config/markets";
import { demoUsdcMint, shareMintAddress } from "@/lib/solana/demo-mints";
import { fromBaseUnits } from "@/lib/solana/units";
import type { UserPosition, YieldOpportunity } from "@/types/flume";

function amountOf(data: Uint8Array | undefined): bigint {
  if (!data) return 0n;
  try {
    return AccountLayout.decode(data).amount;
  } catch {
    return 0n;
  }
}

export function usePositions(opportunities: YieldOpportunity[] | undefined) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const address = publicKey?.toBase58() ?? null;

  const query = useQuery({
    queryKey: ["positions", address],
    enabled: address != null,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!publicKey) return { positions: [] as UserPosition[], usdc: 0 };
      const usdcMint = demoUsdcMint();
      const shareMints = MARKETS.map((market) => ({
        market,
        mint: shareMintAddress(market.id),
      })).filter((item): item is { market: (typeof MARKETS)[number]; mint: NonNullable<ReturnType<typeof shareMintAddress>> } => item.mint != null);

      const addresses = [
        getAssociatedTokenAddressSync(usdcMint, publicKey, false, TOKEN_PROGRAM_ID),
        ...shareMints.map((item) =>
          getAssociatedTokenAddressSync(item.mint, publicKey, false, TOKEN_PROGRAM_ID),
        ),
      ];
      const accounts = await connection.getMultipleAccountsInfo(addresses);
      const usdc = fromBaseUnits(amountOf(accounts[0]?.data));
      const refreshedAt = Date.now();
      const positions: UserPosition[] = [];

      shareMints.forEach((item, index) => {
        const shares = amountOf(accounts[index + 1]?.data);
        if (shares <= 0n) return;
        const opportunity = opportunities?.find((row) => row.id === item.market.id);
        positions.push({
          opportunityId: item.market.id,
          protocol: item.market.protocol,
          market: item.market.market,
          depositedUsdc: fromBaseUnits(shares),
          rawShares: shares.toString(),
          shareMintAddress: item.mint.toBase58(),
          currentBaseApy: opportunity?.baseApy ?? item.market.baseApy,
          currentRewardApy: opportunity?.rewardApy ?? item.market.rewardApy,
          lastRefreshedAt: refreshedAt,
          preview: false,
        });
      });

      positions.sort((a, b) => b.depositedUsdc - a.depositedUsdc);
      return { positions, usdc };
    },
  });

  if (!publicKey) {
    const save = opportunities?.find((row) => row.id === PREVIEW_POSITION_ID);
    const market = MARKETS.find((item) => item.id === PREVIEW_POSITION_ID);
    const preview: UserPosition = {
      opportunityId: PREVIEW_POSITION_ID,
      protocol: market?.protocol ?? "Save",
      market: market?.market ?? "Main Pool",
      depositedUsdc: 5_000,
      rawShares: "5000000000",
      shareMintAddress: shareMintAddress(PREVIEW_POSITION_ID)?.toBase58() ?? "",
      currentBaseApy: save?.baseApy ?? market?.baseApy ?? 0.052,
      currentRewardApy: save?.rewardApy ?? market?.rewardApy ?? 0.002,
      lastRefreshedAt: 0,
      preview: true,
    };
    return {
      positions: [preview],
      usdc: null as number | null,
      preview: true,
      isLoading: false,
      refetch: query.refetch,
    };
  }

  return {
    positions: query.data?.positions ?? [],
    usdc: query.data?.usdc ?? null,
    preview: false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
