"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Status } from "@prisma/client";
import { STATUS_ORDER, STATUS_META, PEL_SUBAREAS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Save, Check } from "lucide-react";

type FormValues = {
  status: Status;
  statusOfImplementation: string;
  mainResponsibility: string;
  partResponsibility: string;
  fcl: string;
  aw: string;
  atc: string;
  med: string;
  workRequired: string;
  briefOnWorkRequired: string;
  internalNotes: string;
};

export function PQEditForm({
  pqNo,
  initial,
}: {
  pqNo: string;
  initial: FormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormValues>(key: K, v: FormValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pqs/${pqNo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSavedAt(new Date());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="Status">
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => {
            const active = values.status === s;
            const meta = STATUS_META[s];
            return (
              <button
                type="button"
                key={s}
                onClick={() => set("status", s)}
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
      </Field>

      <Field label="Status of implementation">
        <Textarea
          value={values.statusOfImplementation}
          onChange={(v) => set("statusOfImplementation", v)}
          placeholder="e.g. Satisfactory. To be reviewed for amendment."
          rows={2}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Main PQ responsibility">
          <Input
            value={values.mainResponsibility}
            onChange={(v) => set("mainResponsibility", v)}
            placeholder="e.g. PEL"
          />
        </Field>
        <Field label="Part responsibility">
          <Input
            value={values.partResponsibility}
            onChange={(v) => set("partResponsibility", v)}
            placeholder="e.g. SRD"
          />
        </Field>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
          PEL sub-area responses
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PEL_SUBAREAS.map((sa) => (
            <Field key={sa.key} label={`${sa.label} · ${sa.full}`}>
              <Textarea
                value={values[sa.key as keyof FormValues] as string}
                onChange={(v) => set(sa.key as keyof FormValues, v)}
                placeholder={`${sa.label} response...`}
                rows={2}
              />
            </Field>
          ))}
        </div>
      </div>

      <Field label="Work required (recommendations)">
        <Textarea
          value={values.workRequired}
          onChange={(v) => set("workRequired", v)}
          placeholder="Summary of work needed..."
          rows={3}
        />
      </Field>

      <Field label="Brief on the work required">
        <Textarea
          value={values.briefOnWorkRequired}
          onChange={(v) => set("briefOnWorkRequired", v)}
          placeholder="Narrative response and evidence description..."
          rows={5}
        />
      </Field>

      <Field label="Internal notes">
        <Textarea
          value={values.internalNotes}
          onChange={(v) => set("internalNotes", v)}
          placeholder="Not submitted to ICAO. For OCAA internal use."
          rows={3}
        />
      </Field>

      <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-3 flex items-center gap-3 border-t border-white/5 bg-ink-950/85 backdrop-blur">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium rounded-md shadow-[0_0_0_1px_rgba(59,130,246,0.5)_inset]"
        >
          {saving ? (
            "Saving..."
          ) : (
            <>
              <Save size={14} />
              Save changes
            </>
          )}
        </button>
        {savedAt && !saving && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-300">
            <Check size={14} />
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        {error && <span className="text-sm text-rose-400">{error}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-ink-200 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

const FIELD_BASE =
  "w-full px-3 py-2 text-sm rounded-md border border-white/5 bg-ink-850 text-ink-100 " +
  "placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 " +
  "hover:border-white/10 transition-colors";

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={FIELD_BASE}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${FIELD_BASE} resize-y`}
    />
  );
}
