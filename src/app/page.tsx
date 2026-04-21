import Link from "next/link";
import { prisma } from "@/lib/db";
import { CE_DESCRIPTIONS, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { summarize } from "@/lib/utils";
import { SegmentedProgress, SimpleProgress } from "@/components/ProgressBar";
import { Star, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const all = await prisma.protocolQuestion.findMany({
    select: { pqNo: true, ce: true, status: true, isPPQ: true },
  });

  const overall = summarize(all.map((p) => p.status));
  const ppq = summarize(all.filter((p) => p.isPPQ).map((p) => p.status));

  const ceIds = [...new Set(all.map((p) => p.ce))].sort();
  const ceStats = ceIds.map((ce) => {
    const pqs = all.filter((p) => p.ce === ce);
    return {
      ce,
      description: CE_DESCRIPTIONS[ce] ?? "",
      pqCount: pqs.length,
      ppqCount: pqs.filter((p) => p.isPPQ).length,
      progress: summarize(pqs.map((p) => p.status)),
    };
  });

  return (
    <div className="max-w-6xl">
      <header className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Overview
        </div>
        <h1 className="text-3xl font-semibold text-ink-50 mt-1 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-ink-300 mt-1">
          Oman Civil Aviation Authority · ICAO USOAP CMA · Personnel Licensing
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KPICard
          label="Overall progress"
          value={`${overall.completePct}%`}
          sub={`${overall.byStatus.COMPLETE} of ${overall.total} PQs complete`}
          footer={<SimpleProgress pct={overall.completePct} />}
        />
        <KPICard
          label="Priority PQs (PPQ)"
          value={`${ppq.completePct}%`}
          sub={`${ppq.byStatus.COMPLETE} of ${ppq.total} PPQs complete`}
          footer={<SimpleProgress pct={ppq.completePct} />}
          accent="amber"
        />
        <KPICard
          label="Needs attention"
          value={`${overall.byStatus.NEEDS_WORK + overall.byStatus.NOT_STARTED}`}
          sub={`${overall.byStatus.NOT_STARTED} not started · ${overall.byStatus.NEEDS_WORK} need work`}
        />
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-ink-100 mb-3">
          Status breakdown
        </h2>
        <div className="rounded-lg border border-white/5 bg-ink-900/60 p-5 shadow-panel">
          <SegmentedProgress
            byStatus={overall.byStatus}
            total={overall.total}
            className="h-3"
          />
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: dotColor(s) }}
                />
                <span className="text-ink-300">{STATUS_META[s].label}</span>
                <span className="font-semibold text-ink-50 tabular-nums">
                  {overall.byStatus[s]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-base font-semibold text-ink-100">
            By Critical Element
          </h2>
          <Link
            href="/pqs"
            className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
          >
            View all PQs <ArrowRight size={14} />
          </Link>
        </div>
        <div className="rounded-lg border border-white/5 bg-ink-900/60 divide-y divide-white/5 shadow-panel overflow-hidden">
          {ceStats.map((ce) => (
            <Link
              key={ce.ce}
              href={`/pqs?ce=${ce.ce}`}
              className="group block p-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink-50">{ce.ce}</span>
                    <span className="text-sm text-ink-300 truncate">
                      {ce.description}
                    </span>
                    {ce.ppqCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-400/25">
                        <Star
                          size={10}
                          className="fill-amber-400 text-amber-400"
                        />
                        {ce.ppqCount} PPQ
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <SegmentedProgress
                      byStatus={ce.progress.byStatus}
                      total={ce.progress.total}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold text-ink-50 leading-none tabular-nums">
                    {ce.progress.completePct}%
                  </div>
                  <div className="text-xs text-ink-400 mt-1 tabular-nums">
                    {ce.progress.byStatus.COMPLETE} / {ce.pqCount}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function KPICard({
  label,
  value,
  sub,
  footer,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  footer?: React.ReactNode;
  accent?: "amber";
}) {
  return (
    <div className="relative rounded-lg border border-white/5 bg-ink-900/60 p-5 shadow-panel overflow-hidden">
      {/* Thin top rule for a touch of structure. */}
      <div
        aria-hidden
        className={
          "absolute inset-x-0 top-0 h-px " +
          (accent === "amber"
            ? "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-brand-400/40 to-transparent")
        }
      />
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div
        className={
          "text-3xl font-semibold mt-1 tabular-nums " +
          (accent === "amber" ? "text-amber-300" : "text-ink-50")
        }
      >
        {value}
      </div>
      {sub && <div className="text-sm text-ink-300 mt-1">{sub}</div>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

function dotColor(s: keyof typeof STATUS_META) {
  const map: Record<string, string> = {
    NOT_STARTED: "#94a3b8",
    IN_PROGRESS: "#60a5fa",
    NEEDS_WORK: "#fbbf24",
    UNDER_REVIEW: "#a78bfa",
    COMPLETE: "#34d399",
  };
  return map[s] ?? "#94a3b8";
}
