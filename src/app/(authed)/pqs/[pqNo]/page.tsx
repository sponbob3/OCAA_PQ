import Link from "next/link";
import { notFound } from "next/navigation";
import type { FieldKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hydratePQ } from "@/lib/types";
import { CE_DESCRIPTIONS, STATUS_META } from "@/lib/constants";
import { SECTION_GROUPS } from "@/lib/field-config";
import { getCurrentUser } from "@/lib/current-user";
import { FieldThread } from "@/components/FieldThread";
import { toSubmissionView, type SubmissionView } from "@/lib/submissions";
import { StatusSelect } from "@/components/StatusSelect";
import { EvidenceLinks } from "@/components/EvidenceLinks";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, RadioTower, Star, Clock, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PQDetailPage({
  params,
}: {
  params: Promise<{ pqNo: string }>;
}) {
  const { pqNo } = await params;

  const row = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    include: {
      evidenceLinks: {
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
      },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 10 },
      fieldSubmissions: {
        orderBy: [{ seq: "desc" }],
        include: {
          author: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!row) notFound();

  const pq = hydratePQ(row);
  const currentUser = await getCurrentUser();

  // Bucket submissions by field so each FieldThread gets only its own slice.
  const byField = new Map<FieldKey, SubmissionView[]>();
  for (const sub of row.fieldSubmissions) {
    const list = byField.get(sub.fieldKey) ?? [];
    list.push(toSubmissionView(sub));
    byField.set(sub.fieldKey, list);
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/pqs"
        className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-100 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> All PQs
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-sm text-ink-300">PQ {pq.pqNo}</span>
          <span className="text-ink-600">·</span>
          <span className="px-2 py-0.5 rounded bg-white/5 text-ink-200 text-xs font-medium border border-white/5">
            {pq.ce} · {CE_DESCRIPTIONS[pq.ce] ?? ""}
          </span>
          {pq.isPPQ && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-400/25">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              PPQ · Priority
            </span>
          )}
          {pq.isATC && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-xs font-medium border border-sky-400/25">
              <RadioTower size={10} />
              ATC
            </span>
          )}
          <StatusBadge status={pq.status} />
        </div>
        <h1 className="text-xl font-semibold text-ink-50 leading-snug tracking-tight">
          {pq.question}
        </h1>
      </header>

      <section className="mb-8 rounded-lg border border-white/5 bg-ink-900/50 p-5 shadow-panel">
        <div className="flex items-center gap-3 mb-3">
          <span
            aria-hidden
            className="inline-block w-[3px] h-4 rounded-full bg-brand-400"
          />
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-300">
            ICAO question side · read-only
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {pq.guidance.length > 0 && (
            <div>
              <div className="font-medium text-ink-100 mb-1.5">
                Guidance for review of evidence
              </div>
              <ul className="list-disc pl-5 space-y-1 text-ink-200">
                {pq.guidance.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {pq.icaoReferences.length > 0 && (
            <div>
              <div className="font-medium text-ink-100 mb-1.5">
                ICAO references
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pq.icaoReferences.map((r, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-ink-850 border border-white/5 text-xs font-mono text-ink-200"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pq.amendmentDescription && (
            <div>
              <div className="font-medium text-ink-100 mb-1.5">
                Description of amendment
              </div>
              <p className="text-ink-200">{pq.amendmentDescription}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-ink-100">OCAA response</h2>
          <div className="text-[11px] text-ink-500">
            Each field is an append-only thread · admins can approve a final
            submission
          </div>
        </div>

        <div className="mb-6">
          <StatusSelect pqNo={pq.pqNo} initial={pq.status} />
        </div>

        <div className="space-y-8">
          {SECTION_GROUPS.map((group, gi) => (
            <div key={group.title}>
              {/* Between subsections: a very thin, "incomplete" rule that
                  fades in on both ends so it doesn't draw too hard a
                  line across the panel. Suppressed for the first group
                  so the heading sits flush under the status selector. */}
              {gi > 0 && (
                <div
                  aria-hidden
                  className="h-px bg-gradient-to-r from-transparent via-white/12 to-transparent mb-6"
                />
              )}
              {/* Heading: bold but restrained — gray text with a solid
                  brand accent bar so the label reads as a section tag
                  rather than competing with field content. */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  aria-hidden
                  className="inline-block w-[3px] h-4 rounded-full bg-brand-400"
                />
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-300">
                  {group.title}
                </div>
              </div>
              <div
                className={
                  group.layout === "pair"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                    : group.layout === "quad"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                      : "space-y-3"
                }
              >
                {group.fields.map((fieldKey) => (
                  <FieldThread
                    key={fieldKey}
                    pqNo={pq.pqNo}
                    fieldKey={fieldKey}
                    submissions={byField.get(fieldKey) ?? []}
                    currentUser={{
                      id: currentUser.id,
                      name: currentUser.name,
                      role: currentUser.role,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <EvidenceLinks
          pqNo={pq.pqNo}
          initial={row.evidenceLinks.map((e) => ({
            id: e.id,
            label: e.label,
            url: e.url,
            description: e.description,
            createdAt: e.createdAt.toISOString(),
            createdBy: e.createdBy
              ? { id: e.createdBy.id, name: e.createdBy.name, role: e.createdBy.role }
              : null,
            approvedAt: e.approvedAt ? e.approvedAt.toISOString() : null,
            approvedBy: e.approvedBy
              ? { id: e.approvedBy.id, name: e.approvedBy.name, role: e.approvedBy.role }
              : null,
          }))}
          currentUser={currentUser}
        />
      </section>

      <section className="mb-8 rounded-lg border border-white/5 bg-ink-900/50 p-5 shadow-panel">
        <div className="flex items-center gap-3 mb-3">
          <span
            aria-hidden
            className="inline-block w-[3px] h-4 rounded-full bg-emerald-400"
          />
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-300">
            USOAP response document
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm text-ink-300 max-w-xl leading-relaxed">
            Export this PQ as the Final USOAP Response Document. Pulls the
            protocol question, guidance, ICAO references, the latest
            approved Status of Implementation and OCAA final response,
            and any approved evidence links. Empty fields print as{" "}
            <span className="italic text-ink-400">Pending</span>.
          </div>
          <a
            href={`/api/pqs/${pq.pqNo}/pdf`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-brand-500/15 border border-brand-400/40 text-brand-200 hover:bg-brand-500/25 hover:text-brand-100 text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Download USOAP PDF
          </a>
        </div>
      </section>

      {row.statusHistory.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-ink-100 mb-3">
            Recent status changes
          </h2>
          <ul className="space-y-2">
            {row.statusHistory.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 text-sm text-ink-300"
              >
                <Clock size={12} className="text-ink-500" />
                <span className="text-ink-500 tabular-nums">
                  {new Date(h.changedAt).toLocaleString()}
                </span>
                <span>
                  {h.fromStatus ? STATUS_META[h.fromStatus].label : "(none)"}
                  {" → "}
                  <span className="font-medium text-ink-100">
                    {STATUS_META[h.toStatus].label}
                  </span>
                </span>
                {h.note && (
                  <span className="italic text-ink-400">· {h.note}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
