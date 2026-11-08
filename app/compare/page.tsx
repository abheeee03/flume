import { Suspense } from "react";
import { CompareView } from "@/components/compare/CompareView";

export const metadata = {
  title: "Compare Protocols | Flume",
  description: "Detailed protocol-to-protocol yield, risk, and fee comparison on Solana.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24">
          <p className="type-body text-text-2">Loading comparison...</p>
        </div>
      }
    >
      <CompareView />
    </Suspense>
  );
}

