"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Paperclip,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PanelIndicator } from "./FieldThread";

type UserChip = { id: string; name: string | null; role: Role };

type EvidenceView = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  createdAt: string;
  createdBy: UserChip | null;
  approvedAt: string | null;
  approvedBy: UserChip | null;
};

const FIELD =
  "px-3 py-2 text-sm rounded-md border border-white/5 bg-ink-850 text-ink-100 " +
  "placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40";

export function EvidenceLinks({
  pqNo,
  initial,
  currentUser,
}: {
  pqNo: string;
  initial: EvidenceView[];
  currentUser: { id: string; name: string | null; role: Role };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [links, setLinks] = useState<EvidenceView[]>(initial);
  const [open, setOpen] = useState(initial.length > 0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser.role === "ADMIN";
  const approvedCount = links.filter((l) => l.approvedAt).length;

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pqs/${pqNo}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, url, description: description || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Add failed (${res.status})`);
      }
      const created = (await res.json()) as EvidenceView & {
        createdAt: string | Date;
      };
      setLinks((prev) => [
        ...prev,
        {
          ...created,
          createdAt:
            typeof created.createdAt === "string"
              ? created.createdAt
              : new Date(created.createdAt).toISOString(),
        },
      ]);
      setLabel("");
      setUrl("");
      setDescription("");
      setComposerOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(target: EvidenceView) {
    const ok = window.confirm(
      `Delete evidence "${target.label}"? This cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pqs/${pqNo}/evidence?id=${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      setLinks((prev) => prev.filter((l) => l.id !== target.id));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleApprove(target: EvidenceView) {
    if (!isAdmin) return;
    setBusy(true);
    setError(null);
    const nowApproved = target.approvedAt == null;
    try {
      const res = await fetch(`/api/evidence/${target.id}/approve`, {
        method: nowApproved ? "PATCH" : "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Approve failed (${res.status})`);
      }
      const updated = (await res.json()) as EvidenceView & {
        approvedAt: string | Date | null;
        createdAt: string | Date;
      };
      setLinks((prev) =>
        prev.map((l) =>
          l.id === target.id
            ? {
                ...l,
                approvedAt:
                  updated.approvedAt == null
                    ? null
                    : typeof updated.approvedAt === "string"
                    ? updated.approvedAt
                    : new Date(updated.approvedAt).toISOString(),
                approvedBy: updated.approvedBy ?? null,
              }
            : l
        )
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  function onAddClick() {
    setOpen(true);
    setComposerOpen(true);
  }

  return (
    <div className="rounded-lg border border-white/5 bg-ink-900/60 overflow-hidden">
      {/* Header: collapsed summary + action cluster */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left group"
          aria-expanded={open}
        >
          <ChevronDown
            size={14}
            className={cn(
              "text-ink-500 transition-transform shrink-0",
              !open && "-rotate-90"
            )}
          />
          <Paperclip size={14} className="text-ink-400 shrink-0" />
          <span className="text-sm font-semibold text-ink-100">Evidence</span>
          {/* Tiny green pilot light when the dropdown has entries, so
              a collapsed Evidence panel still reads as "has content"
              at a glance. */}
          {links.length > 0 && (
            <PanelIndicator title={`${links.length} evidence attached`} />
          )}
          <CountChip total={links.length} approved={approvedCount} />
        </button>
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 text-[11px] text-brand-300 hover:text-brand-200 border border-brand-400/25 bg-brand-500/10 hover:bg-brand-500/15 rounded px-2 py-1 transition-colors shrink-0"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-white/5">
          {composerOpen && (
            <form
              onSubmit={addLink}
              className="border-b border-white/5 bg-ink-950/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
                  New evidence
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    setLabel("");
                    setUrl("");
                    setDescription("");
                    setError(null);
                  }}
                  className="text-[11px] text-ink-400 hover:text-ink-200 inline-flex items-center gap-1"
                >
                  <X size={11} /> Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Label (e.g. CAR-FCL Reg.)"
                  className={FIELD}
                  required
                  autoFocus
                />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className={FIELD}
                  required
                />
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className={`${FIELD} w-full`}
              />
              {error && (
                <div className="text-[11px] text-rose-300">{error}</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm transition-colors"
                >
                  <Plus size={14} />
                  {busy ? "Adding..." : "Add evidence"}
                </button>
                <span className="text-[11px] text-ink-500">
                  Added as {currentUser.name ?? "you"}
                </span>
              </div>
            </form>
          )}

          {links.length === 0 ? (
            <div className="px-5 py-6 text-sm text-ink-400 italic">
              No evidence attached yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {links.map((l) => (
                <EvidenceRow
                  key={l.id}
                  link={l}
                  isAdmin={isAdmin}
                  busy={busy}
                  onApprove={() => void toggleApprove(l)}
                  onDelete={() => void removeLink(l)}
                />
              ))}
            </ul>
          )}

          {error && !composerOpen && (
            <div className="px-5 py-2 text-[11px] text-rose-300 border-t border-white/5">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceRow({
  link,
  isAdmin,
  busy,
  onApprove,
  onDelete,
}: {
  link: EvidenceView;
  isAdmin: boolean;
  busy: boolean;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const adminAdded = link.createdBy?.role === "ADMIN";
  const isApproved = link.approvedAt != null;
  return (
    <li
      className={cn(
        "relative px-5 py-3",
        adminAdded && "bg-brand-500/[0.04]"
      )}
    >
      {adminAdded && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-brand-400/60"
        />
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 hover:text-brand-200 hover:underline"
          >
            {link.label}
            <ExternalLink size={11} />
          </a>
          <div className="text-[11px] text-ink-500 truncate">{link.url}</div>
          {link.description && (
            <div className="text-sm text-ink-300 mt-1">{link.description}</div>
          )}

          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <AuthorLabel user={link.createdBy} />
            <span className="text-ink-500 tabular-nums">
              {formatRelative(link.createdAt)}
            </span>
            {isApproved && link.approvedBy && (
              <ApprovedBadge by={link.approvedBy} />
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              title={isApproved ? "Unapprove" : "Approve evidence"}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] rounded border px-1.5 py-1 transition-colors",
                isApproved
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                  : "border-white/5 text-ink-300 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-500/10"
              )}
            >
              {isApproved ? <X size={12} /> : <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              title="Delete evidence"
              className="inline-flex items-center text-[11px] rounded border border-white/5 text-ink-300 hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-500/10 px-1.5 py-1 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function CountChip({
  total,
  approved,
}: {
  total: number;
  approved: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] tabular-nums",
        "px-1.5 py-0.5 rounded border",
        total === 0
          ? "border-white/5 bg-white/[0.02] text-ink-500"
          : "border-white/10 bg-white/[0.04] text-ink-300"
      )}
    >
      {total}
      {approved > 0 && (
        <span className="text-emerald-300 inline-flex items-center gap-0.5">
          <Check size={10} />
          {approved}
        </span>
      )}
    </span>
  );
}

function AuthorLabel({ user }: { user: UserChip | null }) {
  if (!user) {
    return <span className="text-ink-500">unknown</span>;
  }
  const initials = (user.name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isAdmin = user.role === "ADMIN";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-semibold tabular-nums",
          isAdmin
            ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30"
            : "bg-white/5 text-ink-300 ring-1 ring-white/5"
        )}
      >
        {initials}
      </span>
      <span className="text-ink-200">{user.name ?? "unknown"}</span>
      {isAdmin && (
        <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-[0.12em] text-brand-300 border border-brand-400/30 bg-brand-500/10 rounded px-1 py-0.5">
          <Shield size={9} />
          admin
        </span>
      )}
    </span>
  );
}

function ApprovedBadge({ by }: { by: UserChip }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300 border border-emerald-400/30 bg-emerald-500/10 rounded px-1 py-0.5">
      <Check size={10} />
      approved{by.name ? ` by ${by.name.split(" ")[0]}` : ""}
    </span>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
