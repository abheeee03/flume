"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Retry } from "@/components/glaze/icon";
import { Icon } from "@/components/glaze/icon";
import { Badge } from "@/components/glaze/ui/badge";
import { Button } from "@/components/glaze/ui/button";

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function Navbar({
  connected,
  isDevnet,
  solBalance,
  usdcBalance,
  balancesAvailable,
  isRefreshing = false,
  onRefresh,
}: {
  connected: boolean;
  isDevnet: boolean;
  solBalance: number;
  usdcBalance: number;
  balancesAvailable: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const address = publicKey?.toBase58();

  return (
    <header className="flex flex-wrap items-center justify-end gap-2">
      <Badge variant="outline">{isDevnet ? "Devnet" : "Mainnet"}</Badge>
      {connected && balancesAvailable ? (
        <p className="type-body-sm text-text-2 tabular-nums">
          {usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
          <span className="text-text-3"> · </span>
          {solBalance.toFixed(4)} SOL
        </p>
      ) : null}
      {connected && !balancesAvailable ? (
        <p className="type-body-sm text-text-2">Balance unavailable</p>
      ) : null}
      {connected && address ? (
        <Button variant="secondary" onClick={() => disconnect()}>
          Disconnect {shortAddress(address)}
        </Button>
      ) : (
        <Button onClick={() => setVisible(true)}>Connect wallet</Button>
      )}
      {connected && onRefresh ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh balances"
          pending={isRefreshing}
          onClick={onRefresh}
        >
          <Icon icon={Retry} />
        </Button>
      ) : null}
    </header>
  );
}
