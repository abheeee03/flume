import type { RiskSignal } from "@/types/flume";
import { Badge } from "@/components/glaze/ui/badge";
import { PopoverInfo } from "@/components/glaze/ui/popover";

const variantFor = {
  low: "ok",
  medium: "warn",
  high: "fail",
} as const;

export function RiskBadgeList({ signals }: { signals: RiskSignal[] }) {
  if (signals.length === 0) {
    return <Badge variant="ok">No rule-based flags</Badge>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {signals.map((signal) => (
        <li key={signal.id} className="flex items-center gap-1">
          <Badge variant={variantFor[signal.severity]}>{signal.label}</Badge>
          <PopoverInfo label={`Why: ${signal.label}`}>{signal.evidence}</PopoverInfo>
        </li>
      ))}
    </ul>
  );
}
