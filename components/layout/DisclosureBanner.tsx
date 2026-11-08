"use client";

import { CopyButton } from "@/components/glaze/ui/copy-button";

export function DisclosureBanner({
  isDevnet,
  usdcMint,
}: {
  isDevnet: boolean;
  usdcMint: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-2 type-body-sm text-text-2">
      <span>Official {isDevnet ? "devnet" : "mainnet"} USDC</span>
      <span className="type-code-sm text-text-1">
        {usdcMint.slice(0, 4)}…{usdcMint.slice(-4)}
      </span>
      <CopyButton value={usdcMint} label="mint" />
    </p>
  );
}
