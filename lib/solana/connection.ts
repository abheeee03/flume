import { clusterApiUrl, Connection, type Cluster } from "@solana/web3.js";

const CLUSTERS = new Set<Cluster>(["devnet", "testnet", "mainnet-beta"]);

export function getCluster(): Cluster {
  const configured = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
  if (configured && CLUSTERS.has(configured as Cluster)) {
    return configured as Cluster;
  }
  return "devnet";
}

export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(getCluster());
}

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(getRpcUrl(), "confirmed");
  }
  return connection;
}
