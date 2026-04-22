import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CE_DESCRIPTIONS } from "@/lib/constants";
import { summarize } from "@/lib/utils";
import { SegmentedProgress } from "@/components/ProgressBar";
import { PQCard } from "@/components/PQCard";
import { ArrowLeft, Star, RadioTower } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CEPage({
  params,
}: {
  params: Promise<{ ceId: string }>;
}) {
  const { ceId } = await params;

  const pqs = await prisma.protocolQuestion.findMany({
    where: { ce: ceId },
    orderBy: { pqNo: "asc" },
  });

  if (pqs.length === 0) notFound();

  const progress = summarize(pqs.map((p) => p.status));
  const ppqCount = pqs.filter((p) => p.isPPQ).length;
  const atcCount = pqs.filter((p) => p.isATC).length;

  return (
    <div className="max-w-5xl">
      <Link
        href="/usoap-pel"
        className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-100 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> USOAP CMA Tracker
      </Link>

      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Critical Element
        </div>
        <h1 className="text-3xl font-semibold text-ink-50 mt-1 tracking-tight">
          {ceId}
          <span className="ml-3 text-base font-normal text-ink-300">
            {CE_DESCRIPTIONS[ceId] ?? ""}
          </span>
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-ink-300">
          <span className="tabular-nums">{pqs.length} PQs</span>
          {ppqCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-400/25">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {ppqCount} PPQ
            </span>
          )}
          {atcCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 text-xs font-medium border border-sky-400/25">
              <RadioTower size={10} />
              {atcCount} ATC
            </span>
          )}
          <span className="font-semibold text-ink-50 tabular-nums">
            {progress.completePct}% complete
          </span>
        </div>
        <div className="mt-3">
          <SegmentedProgress
            byStatus={progress.byStatus}
            total={progress.total}
            className="h-3"
          />
        </div>
      </header>

      <div className="space-y-2">
        {pqs.map((pq) => (
          <PQCard key={pq.id} pq={pq} />
        ))}
      </div>
    </div>
  );
}
