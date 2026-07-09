"use client";

// PelSubAreaPanel
//
// Replaces the generic SECTION_GROUP grid for the "PEL sub-area
// responsibility" group on the PQ detail page. The PEL sub-areas are
// special:
//   - Admin-only writes (enforced server-side too).
//   - Admin selects which of the 7 sub-areas (FCL, AW, ATC, MED, FOO,
//     SMS, RPL) are "enabled" on this particular PQ. Disabled sub-areas
//     are still visible to admins as greyed-out cards with a one-click
//     "Add to PQ" button; for non-admins they don't render at all.
//   - The composer for an enabled sub-area uses a name-typeahead
//     populated from every PEL sub-area submission across the app.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FieldKey, Role } from "@prisma/client";
import { Plus, X, ChevronDown } from "lucide-react";
import { FieldThread, type SubmissionView } from "@/components/FieldThread";
import { fieldConfig } from "@/lib/field-config";
import { PEL_SUB_AREA_FIELD_KEYS } from "@/lib/pel";
import { cn } from "@/lib/utils";

type Props = {
  pqNo: string;
  currentUser: { id: string; name: string | null; role: Role };
  isAdmin: boolean;
  initialEnabled: FieldKey[];
  submissionsByField: Partial<Record<FieldKey, SubmissionView[]>>;
  nameSuggestions: string[];
};

export function PelSubAreaPanel({
  pqNo,
  currentUser,
  isAdmin,
  initialEnabled,
  submissionsByField,
  nameSuggestions,
}: Props) {
  const [enabled, setEnabled] = useState<Set<FieldKey>>(
    () => new Set(initialEnabled)
  );
  const [busyKey, setBusyKey] = useState<FieldKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle(key: FieldKey, nextEnabled: boolean) {
    setBusyKey(key);
    setError(null);
    setEnabled((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(key);
      else next.delete(key);
      return next;
    });
    try {
      const res = await fetch(`/api/pqs/${pqNo}/pel-sub-areas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: nextEnabled }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Update failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setEnabled((prev) => {
        const next = new Set(prev);
        if (nextEnabled) next.delete(key);
        else next.add(key);
        return next;
      });
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey(null);
    }
  }

  const visibleKeys = isAdmin
    ? PEL_SUB_AREA_FIELD_KEYS
    : PEL_SUB_AREA_FIELD_KEYS.filter((k) => enabled.has(k));

  if (!isAdmin && visibleKeys.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/5 bg-white/[0.015] px-4 py-3 text-[12px] text-ink-500 italic">
        No PEL sub-areas have been assigned to this PQ yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <SubAreaPickerBanner
          enabledCount={enabled.size}
          totalCount={PEL_SUB_AREA_FIELD_KEYS.length}
          pending={pending}
          error={error}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleKeys.map((key) => {
          const isOn = enabled.has(key);
          const submissions = submissionsByField[key] ?? [];
          if (!isOn && isAdmin) {
            return (
              <DisabledCard
                key={key}
                fieldKey={key}
                onEnable={() => void toggle(key, true)}
                busy={busyKey === key}
                hasContent={submissions.length > 0}
              />
            );
          }
          if (!isOn) return null;
          return (
            <EnabledCard
              key={key}
              fieldKey={key}
              isAdmin={isAdmin}
              busy={busyKey === key}
              onDisable={
                isAdmin ? () => void toggle(key, false) : undefined
              }
            >
              <FieldThread
                pqNo={pqNo}
                fieldKey={key}
                submissions={submissions}
                currentUser={currentUser}
                canWrite={isAdmin}
                nameSuggestions={nameSuggestions}
              />
            </EnabledCard>
          );
        })}
      </div>
    </div>
  );
}

function SubAreaPickerBanner({
  enabledCount,
  totalCount,
  pending,
  error,
}: {
  enabledCount: number;
  totalCount: number;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-white/5 bg-white/[0.02] text-[11px]">
      <span className="text-ink-300">
        Admin select · {enabledCount} of {totalCount} sub-areas enabled on this
        PQ
      </span>
      {pending && (
        <span className="text-ink-500 italic">syncing...</span>
      )}
      {error && (
        <span className="text-rose-300" role="alert">
          {error}
        </span>
      )}
      <span className="ml-auto text-ink-500">
        Disabled sub-areas only show to admins
      </span>
    </div>
  );
}

function DisabledCard({
  fieldKey,
  onEnable,
  busy,
  hasContent,
}: {
  fieldKey: FieldKey;
  onEnable: () => void;
  busy: boolean;
  hasContent: boolean;
}) {
  const cfg = fieldConfig(fieldKey);
  return (
    <div
      className={cn(
        "relative rounded-lg border border-white/5 bg-ink-900/30 px-5 py-4 transition-opacity",
        busy ? "opacity-60" : "opacity-70 hover:opacity-90"
      )}
      title={`${cfg.label} is not enabled on this PQ. Click Add to enable.`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink-300 leading-tight">
            {cfg.label}
          </div>
          {cfg.sublabel && (
            <div className="text-[11px] text-ink-500 mt-0.5">
              {cfg.sublabel}
            </div>
          )}
          <div className="mt-2 text-[11px] text-ink-500 italic">
            {hasContent
              ? "Hidden from non-admins. Existing entries are preserved if you re-enable."
              : "Not assigned to this PQ."}
          </div>
        </div>
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-500/80 hover:bg-brand-400 border border-brand-300/50 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-60 shrink-0"
        >
          <Plus size={12} strokeWidth={2.5} />
          Add to PQ
        </button>
      </div>
    </div>
  );
}

function EnabledCard({
  fieldKey,
  isAdmin,
  busy,
  onDisable,
  children,
}: {
  fieldKey: FieldKey;
  isAdmin: boolean;
  busy: boolean;
  onDisable?: () => void;
  children: React.ReactNode;
}) {
  // The card wraps a normal FieldThread but adds an admin-only "remove
  // from PQ" affordance at the very bottom so the action is reachable
  // without being intrusive. Editors don't see this control.
  return (
    <div className={cn("relative", busy && "opacity-70")}>
      {children}
      {isAdmin && onDisable && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Remove ${fieldKey} from this PQ? Existing entries are kept and will reappear if you add it back.`
                )
              )
                onDisable();
            }}
            disabled={busy}
            title="Hide this sub-area from this PQ"
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-ink-500 hover:text-rose-300 border border-white/5 hover:border-rose-400/30 hover:bg-rose-500/10 rounded px-2 py-1 transition-colors"
          >
            <X size={10} />
            Remove from PQ
          </button>
        </div>
      )}
    </div>
  );
}

// Tiny chevron-only banner used elsewhere on the page; exported so the
// PQ detail layout can drop one above this panel without redefining the
// markup. Currently unused but kept as a public hook.
export function PelSubAreaSectionMarker({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">
      <ChevronDown size={10} />
      {count} sub-area{count === 1 ? "" : "s"}
    </span>
  );
}
