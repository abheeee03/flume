"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/glaze/ui/button";

export function Navbar({
  highlightSeed,
  onMinted,
}: {
  highlightSeed: boolean;
  onMinted: () => void;
}) {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<"mint_usdc" | "seed_save_position" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: "mint_usdc" | "seed_save_position") {
    if (!publicKey) {
      setFailed(true);
      setMessage("Connect a devnet wallet first.");
      return;
    }
    setPending(action);
    setFailed(false);
    setMessage(null);
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58(), action }),
      });
      const body = (await response.json()) as { error?: string; amountUi?: number; symbol?: string };
      if (!response.ok) throw new Error(body.error ?? "Faucet request failed.");
      setMessage(`Sent ${body.amountUi?.toLocaleString("en-US")} ${body.symbol ?? "tokens"} on devnet.`);
      await queryClient.invalidateQueries({ queryKey: ["positions"] });
      onMinted();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Faucet request failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="type-title me-auto">Flume</h1>
        <Button
          variant="secondary"
          disabled={!publicKey || pending != null}
          pending={pending === "mint_usdc"}
          onClick={() => run("mint_usdc")}
        >
          Mint $10,000 demo USDC
        </Button>
        <Button
          variant={highlightSeed ? "primary" : "secondary"}
          disabled={!publicKey || pending != null}
          pending={pending === "seed_save_position"}
          onClick={() => run("seed_save_position")}
        >
          Seed $5,000 Save position
        </Button>
        <WalletMultiButton />
      </div>
      {message ? (
        <p className={failed ? "type-body-sm text-fail-text" : "type-body-sm text-text-2"} role="status">
          {message}
        </p>
      ) : null}
    </header>
  );
}
