import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getActiveCluster, isDevnetMode } from '@/config/markets';
import { NetworkCluster } from '@/types/flume';

const connectionCache: Partial<Record<NetworkCluster, Connection>> = {};

export function getRpcEndpoint(cluster?: NetworkCluster): string {
  const target = cluster ?? getActiveCluster();
  if (target === 'devnet') {
    return (
      process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl('devnet')
    );
  }
  return (
    process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    clusterApiUrl('mainnet-beta')
  );
}

export function getSolanaConnection(cluster?: NetworkCluster): Connection {
  const target = cluster ?? getActiveCluster();
  if (!connectionCache[target]) {
    connectionCache[target] = new Connection(getRpcEndpoint(target), {
      commitment: 'confirmed',
    });
  }
  return connectionCache[target]!;
}

export function getExplorerTxUrl(signature: string, cluster?: NetworkCluster): string {
  const target = cluster ?? (isDevnetMode() ? 'devnet' : 'mainnet-beta');
  const suffix = target === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}