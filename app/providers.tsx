"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Adapter } from "@solana/wallet-adapter-base";
import { getRpcUrl } from "@/lib/solana/connection";
import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  const endpoint = getRpcUrl();
  // Wallet adapter constructors touch browser APIs, so they stay out of the server render.
  const [wallets, setWallets] = useState<Adapter[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adapters are created once, after mount
    setWallets([new PhantomWalletAdapter(), new SolflareWalletAdapter()]);
  }, []);

  const walletKey = useMemo(() => wallets.map((wallet) => wallet.name).join(","), [wallets]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider key={walletKey} wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
