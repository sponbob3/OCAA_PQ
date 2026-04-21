import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hydratePQ } from "@/lib/types";
import { CE_DESCRIPTIONS, STATUS_META } from "@/lib/constants";
import { PQEditForm } from "@/components/PQEditForm";
import { EvidenceLinks } from "@/components/EvidenceLinks";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Star, Clock } from "lucide-react";

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
      evidenceLinks: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 10 },
    },
  });

  if (!row) notFound();

  const pq = hydratePQ(row);

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
          <StatusBadge status={pq.status} />
        </div>
        <h1 className="text-xl font-semibold text-ink-50 leading-snug tracking-tight">
          {pq.question}
        </h1>
      </header>

      <section className="mb-8 rounded-lg border border-white/5 bg-ink-900/50 p-5 shadow-panel">
        <div className="flex items-center gap-2 mb-3">
          <span
            aria-hidden
            className="inline-block w-1 h-3 rounded-full bg-brand-400/60"
          />
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
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
        <h2 className="text-base font-semibold text-ink-100 mb-4">
          OCAA response
        </h2>
        <PQEditForm
          pqNo={pq.pqNo}
          initial={{
            status: pq.status,
            statusOfImplementation: pq.statusOfImplementation ?? "",
            mainResponsibility: pq.mainResponsibility ?? "",
            partResponsibility: pq.partResponsibility ?? "",
            fcl: pq.fcl ?? "",
            aw: pq.aw ?? "",
            atc: pq.atc ?? "",
            med: pq.med ?? "",
            workRequired: pq.workRequired ?? "",
            briefOnWorkRequired: pq.briefOnWorkRequired ?? "",
            internalNotes: pq.internalNotes ?? "",
          }}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-ink-100 mb-3">Evidence</h2>
        <EvidenceLinks pqNo={pq.pqNo} initial={row.evidenceLinks} />
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
                {h.note && <span className="italic text-ink-400">· {h.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
