import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getActiveCluster, isDevnetMode } from '@/config/markets';
import { NetworkCluster } from '@/types/flume';

const PUBLIC_RPC: Record<NetworkCluster, string> = {
  devnet: clusterApiUrl('devnet'),
  'mainnet-beta': clusterApiUrl('mainnet-beta'),
};

const resolvedEndpoints = new Map<NetworkCluster, string>();
const connectionCache = new Map<string, Connection>();

function configuredEndpoint(target: NetworkCluster): string {
  if (target === 'devnet') {
    return (
      process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      PUBLIC_RPC.devnet
    );
  }
  return (
    process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    PUBLIC_RPC['mainnet-beta']
  );
}

function rpcHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'configured-rpc';
  }
}

async function endpointResponds(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      signal: AbortSignal.timeout(4_000),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function resolveRpcEndpoint(
  cluster?: NetworkCluster
): Promise<string> {
  const target = cluster ?? getActiveCluster();
  const cached = resolvedEndpoints.get(target);
  if (cached) return cached;

  const preferred = configuredEndpoint(target);
  const fallback = PUBLIC_RPC[target];
  let chosen = preferred;

  if (!(await endpointResponds(preferred))) {
    if (preferred !== fallback && (await endpointResponds(fallback))) {
      console.warn(
        `[Flume RPC] ${rpcHost(preferred)} did not respond. Using ${rpcHost(fallback)}.`
      );
      chosen = fallback;
    }
  }

  resolvedEndpoints.set(target, chosen);
  return chosen;
}

export function getRpcEndpoint(cluster?: NetworkCluster): string {
  const target = cluster ?? getActiveCluster();
  return resolvedEndpoints.get(target) ?? configuredEndpoint(target);
}

export async function getSolanaConnection(
  cluster?: NetworkCluster
): Promise<Connection> {
  const endpoint = await resolveRpcEndpoint(cluster);
  const existing = connectionCache.get(endpoint);
  if (existing) return existing;

  const connection = new Connection(endpoint, {
    commitment: 'confirmed',
  });
  connectionCache.set(endpoint, connection);
  return connection;
}

export function getExplorerTxUrl(
  signature: string,
  cluster?: NetworkCluster
): string {
  const target = cluster ?? (isDevnetMode() ? 'devnet' : 'mainnet-beta');
  const suffix = target === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
