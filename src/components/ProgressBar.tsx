import type { Status } from "@prisma/client";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Stacked segmented progress bar. Shows each status as a proportional slice.
export function SegmentedProgress({
  byStatus,
  total,
  className,
}: {
  byStatus: Record<Status, number>;
  total: number;
  className?: string;
}) {
  const track = "h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/5 overflow-hidden";
  if (total === 0) {
    return <div className={cn(track, className)} />;
  }
  return (
    <div className={cn("flex w-full", track, className)}>
      {STATUS_ORDER.map((s) => {
        const pct = (byStatus[s] / total) * 100;
        if (pct === 0) return null;
        const bgMap: Record<Status, string> = {
          NOT_STARTED: "bg-slate-500/70",
          IN_PROGRESS: "bg-sky-500",
          NEEDS_WORK: "bg-amber-500",
          UNDER_REVIEW: "bg-violet-500",
          COMPLETE: "bg-emerald-500",
        };
        return (
          <div
            key={s}
            className={bgMap[s]}
            style={{ width: `${pct}%` }}
            title={`${STATUS_META[s].label}: ${byStatus[s]}`}
          />
        );
      })}
    </div>
  );
}

// Single-color progress (used for % complete). Emerald carries the semantic
// "done" meaning from the segmented variant.
export function SimpleProgress({ pct, className }: { pct: number; className?: string }) {
  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-white/5 ring-1 ring-inset ring-white/5 overflow-hidden",
        className
      )}
    >
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
