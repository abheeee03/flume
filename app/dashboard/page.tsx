import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = {
  title: "Dashboard | Flume",
  description: "Compare USDC yields and execute atomic migrations across Solana lending markets.",
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24">
          <p className="type-body text-text-2">Loading dashboard...</p>
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
