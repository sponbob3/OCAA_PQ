import type { Status } from "@prisma/client";
import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Dot-prefixed pill. The tiny dot reads as a signal indicator against the
// dark surface and gives each state a visual key independent of color-blindness.
export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const dotBg: Record<Status, string> = {
    NOT_STARTED: "bg-slate-400",
    IN_PROGRESS: "bg-sky-400",
    NEEDS_WORK: "bg-amber-400",
    UNDER_REVIEW: "bg-violet-400",
    COMPLETE: "bg-emerald-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        meta.bg,
        meta.color,
        meta.border,
        className
      )}
    >
      <span
        aria-hidden
        className={cn("inline-block w-1.5 h-1.5 rounded-full", dotBg[status])}
      />
      {meta.label}
    </span>
  );
}
