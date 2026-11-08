import { Alert, AlertDescription, AlertTitle } from "@/components/glaze/ui/alert";

export function DisclosureBanner({ source }: { source?: string }) {
  const sourceLabel =
    source === "live_mainnet_api"
      ? "Live mainnet rates are loaded."
      : source === "mixed"
        ? "Some rates are live and the rest use the fallback snapshot."
        : source === "fallback_snapshot"
          ? "External rates were unavailable, so this view uses the fallback snapshot."
          : "Rates refresh from mainnet when the feed responds.";

  return (
    <Alert status="neutral">
      <AlertTitle>Hybrid demo</AlertTitle>
      <AlertDescription>
        Yield rates and TVLs come from live Solana mainnet markets, with a deterministic fallback.
        Wallet balances and one-transaction migrations run on Solana devnet using SPL receipt tokens.
        {" "}
        {sourceLabel}
      </AlertDescription>
    </Alert>
  );
}
