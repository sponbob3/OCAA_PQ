"use client";

// Admin-only toggles for the PQ flags PPQ and ATC. Renders as two small
// pill buttons next to the rest of the PQ header chips. Non-admin
// callers should not render this component at all; the API route
// rejects the request anyway, but hiding the UI keeps the header tidy.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RadioTower, Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Flag = "PPQ" | "ATC";

type Props = {
  pqNo: string;
  isPPQ: boolean;
  isATC: boolean;
};

export function PQFlagToggles({ pqNo, isPPQ, isATC }: Props) {
  const router = useRouter();
  const [ppq, setPpq] = useState(isPPQ);
  const [atc, setAtc] = useState(isATC);
  const [pending, startTransition] = useTransition();
  const [busyFlag, setBusyFlag] = useState<Flag | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(flag: Flag, next: boolean) {
    setBusyFlag(flag);
    setError(null);

    // Optimistic: update the local pill immediately so the click feels
    // instant; revert on failure.
    if (flag === "PPQ") setPpq(next);
    else setAtc(next);

    try {
      const res = await fetch(`/api/pqs/${pqNo}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, value: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Update failed (${res.status})`);
      }
      // Re-fetch server data so other surfaces (badges, list views) pick
      // up the new flag without a full page reload.
      startTransition(() => router.refresh());
    } catch (err) {
      if (flag === "PPQ") setPpq(!next);
      else setAtc(!next);
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyFlag(null);
    }
  }

  const ppqDisabled = pending || busyFlag === "PPQ";
  const atcDisabled = pending || busyFlag === "ATC";

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => toggle("PPQ", !ppq)}
        disabled={ppqDisabled}
        title={ppq ? "Remove PPQ designation" : "Mark as Priority PQ"}
        aria-pressed={ppq}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors",
          ppq
            ? "bg-amber-500/15 text-amber-300 border-amber-400/40 hover:bg-amber-500/25"
            : "bg-white/[0.02] text-ink-400 border-white/10 hover:text-amber-200 hover:border-amber-400/30 hover:bg-amber-500/5",
          ppqDisabled && "opacity-60 cursor-wait"
        )}
      >
        <Star
          size={10}
          className={ppq ? "fill-amber-400 text-amber-400" : ""}
        />
        PPQ
      </button>

      <button
        type="button"
        onClick={() => toggle("ATC", !atc)}
        disabled={atcDisabled}
        title={atc ? "Remove ATC designation" : "Mark as ATC"}
        aria-pressed={atc}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors",
          atc
            ? "bg-sky-500/15 text-sky-300 border-sky-400/40 hover:bg-sky-500/25"
            : "bg-white/[0.02] text-ink-400 border-white/10 hover:text-sky-200 hover:border-sky-400/30 hover:bg-sky-500/5",
          atcDisabled && "opacity-60 cursor-wait"
        )}
      >
        <RadioTower size={10} />
        ATC
      </button>

      {error && (
        <span className="text-[11px] text-rose-300 ml-1" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
