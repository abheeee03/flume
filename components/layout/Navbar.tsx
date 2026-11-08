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
      {connected && balancesAvailable ? (
        <div className="flex items-center gap-1.5">
          <Badge variant="ok" className="tabular-nums">
            {usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
          </Badge>
          <Badge variant="neutral" className="tabular-nums">
            {solBalance.toFixed(3)} SOL
          </Badge>
        </div>
      ) : null}
      {connected && !balancesAvailable ? (
        <Badge variant="warn">Loading balance…</Badge>
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
