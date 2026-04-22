"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { STATUS_ORDER, STATUS_META, CE_DESCRIPTIONS } from "@/lib/constants";
import { Search, X } from "lucide-react";

const CONTROL =
  "px-3 py-2 text-sm rounded-md border border-white/5 bg-ink-850 text-ink-100 " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 " +
  "hover:border-white/10 transition-colors";

export function FilterBar({ ces }: { ces: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.push(`/pqs?${next.toString()}`);
    },
    [params, router]
  );

  const activeCE = params.get("ce") ?? "";
  const activeStatus = params.get("status") ?? "";
  const activePPQ = params.get("ppq") === "1";
  const activeATC = params.get("atc") === "1";
  const activeQ = params.get("q") ?? "";
  const activeSort = params.get("sort") ?? "pq";

  const hasActiveFilters =
    activeCE ||
    activeStatus ||
    activePPQ ||
    activeATC ||
    activeQ ||
    activeSort !== "pq";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <input
            type="text"
            placeholder="Search question text or PQ number..."
            defaultValue={activeQ}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) updateParam("q", null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("q", (e.target as HTMLInputElement).value || null);
              }
            }}
            className={`${CONTROL} w-full pl-8 placeholder:text-ink-500`}
          />
        </div>

        <select
          value={activeCE}
          onChange={(e) => updateParam("ce", e.target.value || null)}
          className={CONTROL}
        >
          <option value="">All CEs</option>
          {ces.map((ce) => (
            <option key={ce} value={ce}>
              {ce} · {CE_DESCRIPTIONS[ce] ?? ""}
            </option>
          ))}
        </select>

        <select
          value={activeStatus}
          onChange={(e) => updateParam("status", e.target.value || null)}
          className={CONTROL}
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>

        <select
          value={activeSort}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className={CONTROL}
        >
          <option value="pq">Sort: PQ number</option>
          <option value="status">Sort: Status</option>
          <option value="ce">Sort: CE</option>
        </select>

        <label
          className={`${CONTROL} inline-flex items-center gap-2 cursor-pointer select-none`}
        >
          <input
            type="checkbox"
            checked={activePPQ}
            onChange={(e) => updateParam("ppq", e.target.checked ? "1" : null)}
            className="accent-amber-400"
          />
          PPQ only
        </label>

        <label
          className={`${CONTROL} inline-flex items-center gap-2 cursor-pointer select-none`}
        >
          <input
            type="checkbox"
            checked={activeATC}
            onChange={(e) => updateParam("atc", e.target.checked ? "1" : null)}
            className="accent-sky-400"
          />
          ATC only
        </label>

        {hasActiveFilters && (
          <button
            onClick={() => router.push("/pqs")}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-ink-300 hover:text-ink-50 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
