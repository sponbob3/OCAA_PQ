"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Status } from "@prisma/client";
import { Check, Save } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusSelect({
  pqNo,
  initial,
}: {
  pqNo: string;
  initial: Status;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Status>(initial);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const dirty = value !== initial || note.trim().length > 0;

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pqs/${pqNo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: value,
          statusChangeNote: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      setSavedAt(new Date());
      setNote("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/5 bg-ink-900/50 shadow-panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-sm font-medium text-ink-100">Status</div>
        <span className="text-[11px] text-ink-500">
          Changes are audited in the status history below.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => {
          const active = value === s;
          const meta = STATUS_META[s];
          return (
            <button
              type="button"
              key={s}
              onClick={() => setValue(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm border transition-colors",
                active
                  ? `${meta.bg} ${meta.color} ${meta.border} ring-1 ring-inset ring-white/10`
                  : "bg-ink-900 text-ink-300 border-white/5 hover:bg-ink-850 hover:text-ink-100"
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {value !== initial && (
        <div className="mt-3">
          <label className="block text-[11px] uppercase tracking-[0.14em] text-ink-400 mb-1">
            Change note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. evidence delivered, closed pending review"
            className="w-full px-3 py-1.5 text-sm rounded-md border border-white/5 bg-ink-850 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium rounded-md shadow-[0_0_0_1px_rgba(59,130,246,0.5)_inset]"
        >
          {saving ? (
            "Saving..."
          ) : (
            <>
              <Save size={13} />
              Save status
            </>
          )}
        </button>
        {savedAt && !saving && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300">
            <Check size={12} />
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        {error && <span className="text-[12px] text-rose-400">{error}</span>}
      </div>
    </div>
  );
}
