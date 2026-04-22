"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  MessageSquarePlus,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { FieldKey, Role } from "@prisma/client";
import { fieldConfig } from "@/lib/field-config";
import { cn } from "@/lib/utils";
import { safeParseIds, type SubmissionView } from "@/lib/submissions";

export type { SubmissionView };

// Props for an individual thread. The current user is passed in so the
// component can gate admin-only controls without a round-trip.
export function FieldThread({
  pqNo,
  fieldKey,
  submissions: initialSubmissions,
  currentUser,
}: {
  pqNo: string;
  fieldKey: FieldKey;
  submissions: SubmissionView[];
  currentUser: { id: string; name: string | null; role: Role };
}) {
  const cfg = fieldConfig(fieldKey);

  // The server returns submissions for this (pq, field) ordered by seq DESC.
  // We keep our own state so optimistic updates (new submission, approve) can
  // render immediately before the router refresh settles.
  const [submissions, setSubmissions] =
    useState<SubmissionView[]>(initialSubmissions);
  const [logOpen, setLogOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [revisingIds, setRevisingIds] = useState<number[]>([]);
  const [draftValue, setDraftValue] = useState("");
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const router = useRouter();

  const latest = submissions[0];
  const prior = submissions.slice(1);
  const approved = submissions.find((s) => s.approvedAt);
  const approvedIsLatest = approved && approved.id === latest?.id;

  const isAdmin = currentUser.role === "ADMIN";

  function openComposerForRevision(target: SubmissionView) {
    setRevisingIds([target.id]);
    setDraftValue(target.value);
    setComposerOpen(true);
    setError(null);
  }

  // "Revise latest" (or "Draft first") entry point from the field header.
  function openReviseComposer() {
    if (latest) openComposerForRevision(latest);
    else {
      setRevisingIds([]);
      setDraftValue("");
      setComposerOpen(true);
      setError(null);
    }
  }

  // Independent "new submission" path. Empty value, no prior refs. This is
  // semantically distinct from "Revise": the new entry declares itself as
  // a fresh take on the field rather than a revision of something.
  function openNewComposer() {
    setRevisingIds([]);
    setDraftValue("");
    setComposerOpen(true);
    setError(null);
  }

  function closeComposer() {
    setComposerOpen(false);
    setRevisingIds([]);
    setDraftValue("");
    setError(null);
  }

  async function submitDraft() {
    const value = draftValue.trim();
    if (!value) {
      setError("Write something before submitting.");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/pqs/${pqNo}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, value, revisesIds: revisingIds }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const created = (await res.json()) as {
        id: number;
        seq: number;
        value: string;
        revisesIdsJson: string;
        createdAt: string;
        author: { id: string; name: string | null; role: Role };
      };
      const view: SubmissionView = {
        id: created.id,
        seq: created.seq,
        value: created.value,
        revisesIds: safeParseIds(created.revisesIdsJson),
        createdAt: created.createdAt,
        author: created.author,
        authorLabel: null,
        isInitial: false,
        approvedAt: null,
        approvedBy: null,
      };
      setSubmissions((prev) => [view, ...prev]);
      closeComposer();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function deleteSubmission(target: SubmissionView) {
    const ok = window.confirm(
      `Delete submission #${target.seq} by ${
        target.author.name ?? "unknown"
      }? This cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/submissions/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== target.id));
      setExpandedLogIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function toggleApprove(target: SubmissionView) {
    const wasApproved = target.approvedAt != null;
    try {
      const res = await fetch(`/api/submissions/${target.id}/approve`, {
        method: wasApproved ? "DELETE" : "PATCH",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Approval change failed (${res.status})`);
      }
      const now = new Date().toISOString();
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id === target.id) {
            return wasApproved
              ? { ...s, approvedAt: null, approvedBy: null }
              : {
                  ...s,
                  approvedAt: now,
                  approvedBy: {
                    id: currentUser.id,
                    name: currentUser.name,
                    role: currentUser.role,
                  },
                };
          }
          if (!wasApproved && s.approvedAt) {
            return { ...s, approvedAt: null, approvedBy: null };
          }
          return s;
        })
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval change failed");
    }
  }

  // The composer keystroke contract: Enter inserts a newline, Cmd/Ctrl+Enter
  // submits. Keeps long-form authoring natural while giving power users a
  // fast path.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submitDraft();
    }
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-white/5 bg-ink-900/50 shadow-panel overflow-hidden",
        cfg.mode === "inline" ? "p-0" : ""
      )}
    >
      {/* Field header */}
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink-100 leading-tight">
            {cfg.label}
          </div>
          {cfg.sublabel && (
            <div className="text-[11px] text-ink-400 mt-0.5">{cfg.sublabel}</div>
          )}
        </div>
        {/* Button hierarchy: "New" is the primary action (bright brand
            fill, slightly larger click target). "Revise" is the muted
            secondary — always available but visually deferring to New
            so drafting a fresh thought is the default. */}
        <div className="flex items-center gap-1.5 shrink-0">
          {latest && (
            <button
              type="button"
              onClick={openNewComposer}
              title="Start a new submission (not tied to any previous one)"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-400 border border-brand-300/60 rounded-md px-3 py-1.5 transition-colors shadow-[0_0_0_1px_rgba(59,130,246,0.35)_inset,0_1px_2px_rgba(0,0,0,0.3)]"
            >
              <Plus size={13} strokeWidth={2.5} />
              New
            </button>
          )}
          <button
            type="button"
            onClick={openReviseComposer}
            title={
              latest
                ? "Revise the latest submission"
                : "Draft the first submission"
            }
            className={cn(
              "inline-flex items-center gap-1 rounded transition-colors",
              // First-ever submission gets the primary treatment since
              // there is no "New" button yet; afterwards Revise is
              // secondary to New.
              latest
                ? "text-[11px] text-ink-400 hover:text-ink-100 border border-white/10 bg-white/[0.015] hover:bg-white/[0.04] px-2 py-1"
                : "text-xs font-semibold text-white bg-brand-500 hover:bg-brand-400 border border-brand-300/60 rounded-md px-3 py-1.5 shadow-[0_0_0_1px_rgba(59,130,246,0.35)_inset,0_1px_2px_rgba(0,0,0,0.3)]"
            )}
          >
            <MessageSquarePlus size={latest ? 11 : 13} />
            {latest ? "Revise" : "Draft"}
          </button>
        </div>
      </header>

      {/* Current (latest) display */}
      <div className="px-5 pb-3">
        {latest ? (
          <CurrentDisplay
            submission={latest}
            mode={cfg.mode}
            approvedIsLatest={Boolean(approvedIsLatest)}
            isAdmin={isAdmin}
            onRevise={() => openComposerForRevision(latest)}
            onApprove={() => void toggleApprove(latest)}
            onDelete={() => void deleteSubmission(latest)}
          />
        ) : (
          <EmptyState placeholder={cfg.placeholder} />
        )}

        {/* Approved-but-not-latest callout */}
        {approved && !approvedIsLatest && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-300/90 border border-emerald-400/25 bg-emerald-500/10 rounded px-2.5 py-1.5">
            <ShieldCheck size={12} className="shrink-0" />
            <span>
              Approved version is #{approved.seq} (not the latest). Open the
              log to review.
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      {composerOpen && (
        <Composer
          mode={cfg.mode}
          placeholder={cfg.placeholder}
          rows={cfg.composerRows}
          value={draftValue}
          onChange={setDraftValue}
          revisingIds={revisingIds}
          onKeyDown={onKeyDown}
          onSubmit={() => void submitDraft()}
          onCancel={closeComposer}
          authorName={currentUser.name ?? "You"}
          authorRole={currentUser.role}
          error={error}
          pending={pending}
        />
      )}

      {/* Log */}
      {prior.length > 0 && (
        <div className="border-t border-white/10">
          <button
            type="button"
            onClick={() => setLogOpen((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
              logOpen
                ? "text-ink-100 bg-white/[0.04]"
                : "text-ink-300 hover:text-ink-100 hover:bg-white/[0.02]"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronRight
                size={12}
                className={cn("transition-transform", logOpen && "rotate-90")}
              />
              {/* Green indicator: signals the panel has entries inside.
                  Always on here because the log toggle itself is only
                  rendered when prior.length > 0. */}
              <PanelIndicator />
              Log · {prior.length} prior submission
              {prior.length === 1 ? "" : "s"}
            </span>
            <span className="text-ink-400 normal-case tracking-normal">
              {logOpen ? "hide" : "show"}
            </span>
          </button>

          {logOpen && (
            // Lifted panel background (was bg-ink-950/30). The slightly
            // lighter fill separates the log from the card body and
            // makes comment rows easier to scan.
            <div className="border-t border-white/10 divide-y divide-white/5 bg-white/[0.035]">
              {prior.map((s) => (
                <LogEntry
                  key={s.id}
                  submission={s}
                  mode={cfg.mode}
                  expanded={expandedLogIds.has(s.id)}
                  onToggle={() =>
                    setExpandedLogIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    })
                  }
                  isAdmin={isAdmin}
                  onRevise={() => openComposerForRevision(s)}
                  onApprove={() => void toggleApprove(s)}
                  onDelete={() => void deleteSubmission(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CurrentDisplay({
  submission,
  mode,
  approvedIsLatest,
  isAdmin,
  onRevise,
  onApprove,
  onDelete,
}: {
  submission: SubmissionView;
  mode: "block" | "inline";
  approvedIsLatest: boolean;
  isAdmin: boolean;
  onRevise: () => void;
  onApprove: () => void;
  onDelete: () => void;
}) {
  // An author only earns "admin" styling when we're showing their real
  // identity. If a label override is present (e.g. Excel attributed the
  // entry to a non-demo-user name), suppress the admin rail.
  const adminWritten =
    submission.author.role === "ADMIN" && !submission.authorLabel;
  const isApproved = submission.approvedAt != null;
  return (
    <div
      className={cn(
        "rounded-md border overflow-hidden",
        adminWritten
          ? "border-brand-400/30 bg-brand-500/[0.05]"
          : "border-white/5 bg-white/[0.02]"
      )}
    >
      <MetaRow
        submission={submission}
        current
        approvedIsCurrent={approvedIsLatest}
      >
        <InlineActions
          isAdmin={isAdmin}
          isApproved={isApproved}
          canDelete={!submission.isInitial}
          onRevise={onRevise}
          onApprove={onApprove}
          onDelete={onDelete}
        />
      </MetaRow>
      <div
        className={cn(
          mode === "inline"
            ? "px-3 py-2 text-sm text-ink-100 font-mono"
            : "px-4 py-3 text-sm text-ink-100 whitespace-pre-wrap leading-relaxed"
        )}
      >
        {submission.value}
      </div>
      {submission.revisesIds.length > 0 && (
        <div className="px-4 py-1.5 border-t border-white/5 text-[11px] text-ink-400 inline-flex items-center gap-1.5">
          <CornerDownRight size={11} />
          Revises {formatRevises(submission.revisesIds)}
        </div>
      )}
    </div>
  );
}

function LogEntry({
  submission,
  mode,
  expanded,
  onToggle,
  isAdmin,
  onRevise,
  onApprove,
  onDelete,
}: {
  submission: SubmissionView;
  mode: "block" | "inline";
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onRevise: () => void;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const adminWritten =
    submission.author.role === "ADMIN" && !submission.authorLabel;
  const isApproved = submission.approvedAt != null;

  return (
    <div
      className={cn(
        "relative transition-colors",
        adminWritten && "bg-brand-500/[0.04]"
      )}
    >
      {/* Admin side rail */}
      {adminWritten && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-brand-400/60"
        />
      )}
      <div className="flex items-center gap-3 px-5 py-2.5 group hover:bg-white/[0.05] transition-colors">
        {/* Expand toggle. Separate button so the action cluster on the right
            can have its own click targets without fighting the row-wide
            expand. */}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={12}
            className={cn(
              "shrink-0 text-ink-500 transition-transform",
              !expanded && "-rotate-90"
            )}
          />
          <SeqBadge seq={submission.seq} />
          <AuthorLabel submission={submission} />
          <span className="text-[11px] text-ink-500 tabular-nums shrink-0">
            {submission.isInitial
              ? "Initial"
              : formatRelative(submission.createdAt)}
          </span>
          {isApproved && <ApprovedBadge by={submission.approvedBy} compact />}
          {submission.revisesIds.length > 0 && (
            <span className="text-[10px] text-ink-500 tabular-nums shrink-0">
              ⮬ {formatRevises(submission.revisesIds)}
            </span>
          )}
          {!expanded && (
            <span className="min-w-0 flex-1 text-[12px] text-ink-400 truncate italic">
              {previewLine(submission.value)}
            </span>
          )}
        </button>

        {/* Always-visible action cluster. Icon-only to save horizontal
            space; expanded view echoes the same actions with labels. */}
        <InlineActions
          compact
          isAdmin={isAdmin}
          isApproved={isApproved}
          canDelete={!submission.isInitial}
          onRevise={onRevise}
          onApprove={onApprove}
          onDelete={onDelete}
        />
      </div>

      {expanded && (
        <div className="px-5 pb-3 pl-12">
          <div
            className={cn(
              mode === "inline"
                ? "text-sm text-ink-100 font-mono"
                : "text-sm text-ink-200 whitespace-pre-wrap leading-relaxed"
            )}
          >
            {submission.value}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRevise}
              className="inline-flex items-center gap-1 text-[11px] text-ink-300 hover:text-ink-100 border border-white/5 hover:bg-white/[0.04] rounded px-2 py-1 transition-colors"
            >
              <MessageSquarePlus size={11} />
              Revise from here
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onApprove}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] rounded px-2 py-1 border transition-colors",
                  isApproved
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    : "border-white/5 text-ink-300 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-500/10"
                )}
              >
                {isApproved ? (
                  <>
                    <X size={11} /> Unapprove
                  </>
                ) : (
                  <>
                    <Check size={11} /> Approve as final
                  </>
                )}
              </button>
            )}
            {isAdmin && !submission.isInitial && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-[11px] text-ink-300 hover:text-rose-300 border border-white/5 hover:border-rose-400/30 hover:bg-rose-500/10 rounded px-2 py-1 transition-colors"
              >
                <Trash2 size={11} />
                Delete
              </button>
            )}
            {submission.isInitial && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-ink-500 border border-white/5 bg-white/[0.02] rounded px-2 py-1">
                Template · revise only
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  mode,
  placeholder,
  rows,
  value,
  onChange,
  revisingIds,
  onKeyDown,
  onSubmit,
  onCancel,
  authorName,
  authorRole,
  error,
  pending,
}: {
  mode: "block" | "inline";
  placeholder?: string;
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  revisingIds: number[];
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  authorName: string;
  authorRole: Role;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div className="mx-5 mb-4 rounded-md border border-brand-400/30 bg-brand-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-brand-400/20 bg-brand-500/[0.06]">
        <span className="text-[10px] uppercase tracking-[0.14em] text-brand-200">
          Drafting · {authorName}
        </span>
        <RoleChip role={authorRole} />
        {revisingIds.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-300 ml-1">
            <CornerDownRight size={10} />
            Revises #{revisingIds.join(", #")}
          </span>
        )}
        <div className="ml-auto text-[10px] text-ink-400 tabular-nums">
          <kbd className="font-mono">Enter</kbd> newline ·{" "}
          <kbd className="font-mono">⌘/Ctrl+Enter</kbd> submit
        </div>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={mode === "inline" ? 1 : (rows ?? 3)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 text-sm bg-transparent text-ink-100 placeholder:text-ink-500 focus:outline-none resize-y",
          mode === "inline" && "font-mono"
        )}
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-brand-400/20 bg-ink-950/30">
        <div className="min-w-0 text-[11px] text-rose-300">
          {error && <span>{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-[11px] text-ink-400 hover:text-ink-100 px-2 py-1 rounded border border-transparent hover:border-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-[11px] text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-60 rounded px-3 py-1 font-medium shadow-[0_0_0_1px_rgba(59,130,246,0.4)_inset]"
          >
            <Check size={11} />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ placeholder }: { placeholder?: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/5 bg-white/[0.015] px-4 py-3 text-sm text-ink-500 italic">
      No submissions yet{placeholder ? ` · ${placeholder}` : ""}
    </div>
  );
}

function MetaRow({
  submission,
  current,
  approvedIsCurrent,
  children,
}: {
  submission: SubmissionView;
  current?: boolean;
  approvedIsCurrent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 border-b border-white/5 text-[11px]",
        current && "bg-white/[0.02]"
      )}
    >
      <SeqBadge seq={submission.seq} />
      <AuthorLabel submission={submission} />
      <span className="text-ink-500 tabular-nums">
        {submission.isInitial
          ? "Initial"
          : formatRelative(submission.createdAt)}
      </span>
      {current && !submission.isInitial && (
        <span className="text-[9px] uppercase tracking-[0.14em] text-ink-400 border border-white/5 rounded px-1 py-0.5 ml-1">
          latest
        </span>
      )}
      {submission.isInitial && (
        <span
          className="text-[9px] uppercase tracking-[0.14em] text-amber-200/90 border border-amber-400/30 bg-amber-500/10 rounded px-1 py-0.5 ml-1"
          title="Imported from source workbook — protected template"
        >
          Template
        </span>
      )}
      {approvedIsCurrent && submission.approvedBy && (
        <ApprovedBadge by={submission.approvedBy} />
      )}
      {!approvedIsCurrent && submission.approvedAt && submission.approvedBy && (
        <ApprovedBadge by={submission.approvedBy} />
      )}
      {children && <div className="ml-auto flex items-center gap-1">{children}</div>}
    </div>
  );
}

// Reusable action cluster. `compact` renders icon-only buttons suited for
// the dense log rows; otherwise labels are visible too. `canDelete` is a
// per-row override used to hide the delete button on protected initial
// template rows (the API refuses those anyway, but hiding the control
// avoids an avoidable error path).
function InlineActions({
  isAdmin,
  isApproved,
  canDelete = true,
  onRevise,
  onApprove,
  onDelete,
  compact,
}: {
  isAdmin: boolean;
  isApproved: boolean;
  canDelete?: boolean;
  onRevise: () => void;
  onApprove: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const iconSize = compact ? 12 : 13;
  const btn =
    "inline-flex items-center gap-1 rounded border transition-colors shrink-0";
  const pad = compact ? "px-1.5 py-1" : "px-2 py-1";
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRevise();
        }}
        title="Revise from this submission"
        className={cn(
          btn,
          pad,
          "text-[11px] text-ink-300 hover:text-brand-200 border-white/5 hover:border-brand-400/30 hover:bg-brand-500/10"
        )}
      >
        <MessageSquarePlus size={iconSize} />
        {!compact && "Revise"}
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          title={isApproved ? "Unapprove" : "Approve as final"}
          className={cn(
            btn,
            pad,
            "text-[11px]",
            isApproved
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
              : "border-white/5 text-ink-300 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-500/10"
          )}
        >
          {isApproved ? <X size={iconSize} /> : <Check size={iconSize} />}
          {!compact && (isApproved ? "Unapprove" : "Approve")}
        </button>
      )}
      {isAdmin && canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete submission"
          className={cn(
            btn,
            pad,
            "text-[11px] text-ink-300 hover:text-rose-300 border-white/5 hover:border-rose-400/30 hover:bg-rose-500/10"
          )}
        >
          <Trash2 size={iconSize} />
          {!compact && "Delete"}
        </button>
      )}
    </div>
  );
}

// Tiny "has content" pilot light. Used next to any collapsible panel
// toggle when there are entries inside, so users can tell at a glance
// whether a closed dropdown is empty or worth opening.
export function PanelIndicator({
  title = "Has entries",
}: {
  title?: string;
}) {
  return (
    <span
      aria-hidden
      title={title}
      className="relative inline-flex items-center justify-center shrink-0 w-2 h-2 mx-0.5"
    >
      <span
        className="absolute inset-0 rounded-full bg-emerald-400/30"
        style={{ filter: "blur(2px)" }}
      />
      <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.75)]" />
    </span>
  );
}

function SeqBadge({ seq }: { seq: number }) {
  return (
    <span className="font-mono text-[10px] text-ink-300 border border-white/5 bg-white/[0.03] rounded px-1.5 py-0.5 tabular-nums shrink-0">
      #{seq}
    </span>
  );
}

// Author display prioritizes the submission's explicit authorLabel
// override (used for Excel attributions like "(Imtiaz)" that don't map
// to a demo user) over the joined User.name. For unattributed initial
// rows we fall back to a neutral "Initial input" marker rather than
// showing the import sentinel user's name.
function AuthorLabel({ submission }: { submission: SubmissionView }) {
  const usingOverride = submission.authorLabel != null;
  const unattributedInitial = submission.isInitial && !usingOverride &&
    submission.author.role !== "ADMIN";

  const name = unattributedInitial
    ? "Initial input"
    : (submission.authorLabel ?? submission.author.name ?? "Unknown");
  // Admin styling only applies when we're rendering the real admin user
  // (no override). Unattributed initial rows and authorLabel overrides
  // stay neutral.
  const treatAsAdmin =
    submission.author.role === "ADMIN" && !usingOverride;

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span
        aria-hidden
        className={cn(
          "w-5 h-5 rounded-full grid place-items-center text-[9px] font-semibold",
          treatAsAdmin
            ? "bg-brand-500/20 text-brand-200 border border-brand-400/40"
            : unattributedInitial
              ? "bg-amber-500/10 text-amber-200 border border-amber-400/30"
              : "bg-white/[0.06] text-ink-300 border border-white/10"
        )}
      >
        {unattributedInitial ? "·" : initials(name)}
      </span>
      <span
        className={cn(
          "truncate max-w-[180px]",
          unattributedInitial ? "text-ink-400 italic" : "text-ink-200"
        )}
      >
        {name}
      </span>
      {treatAsAdmin && <RoleChip role="ADMIN" />}
      {!treatAsAdmin && !unattributedInitial && usingOverride && (
        <span
          className="text-[9px] uppercase tracking-[0.14em] text-ink-500 border border-white/5 rounded px-1 py-0.5"
          title="Name carried over from source workbook"
        >
          From source
        </span>
      )}
    </span>
  );
}

function RoleChip({ role }: { role: Role }) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-[0.14em] text-brand-200 border border-brand-400/40 bg-brand-500/15 rounded px-1 py-0.5">
        <Shield size={9} /> Admin
      </span>
    );
  }
  if (role === "EDITOR") {
    return (
      <span className="text-[9px] uppercase tracking-[0.14em] text-ink-400 border border-white/10 rounded px-1 py-0.5">
        Editor
      </span>
    );
  }
  return (
    <span className="text-[9px] uppercase tracking-[0.14em] text-ink-500 border border-white/5 rounded px-1 py-0.5">
      Viewer
    </span>
  );
}

function ApprovedBadge({
  by,
  compact,
}: {
  by: { name: string | null; role: Role } | null;
  compact?: boolean;
}) {
  const name = by?.name ?? "admin";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      )}
      title={`Approved by ${name}`}
    >
      <CheckCircle2 size={compact ? 9 : 10} />
      {compact ? "Approved" : `Approved · ${name}`}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRevises(ids: number[]) {
  return ids.map((i) => `#${i}`).join(", ");
}

function previewLine(value: string) {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? flat.slice(0, 140) + "…" : flat;
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Local utility for consumers needing to get the "current display value"
// outside this component (e.g. a list row summary).
export function currentValueFor(
  submissions: SubmissionView[]
): string | null {
  return submissions[0]?.value ?? null;
}
