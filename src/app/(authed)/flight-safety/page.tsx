import Link from "next/link";
import { ArrowRight, CircleDashed, CircleDot, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { ACTIVITIES, SECTIONS, type SectionId, type ActivityId } from "@/lib/nav";
import { summarize } from "@/lib/utils";
import { SimpleProgress } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

type CellStatus =
  | { kind: "not_configured" }
  | {
      kind: "live";
      href: string;
      pct: number;
      done: number;
      total: number;
      inProgress: number;
    };

export default async function FlightSafetyDepartmentPage() {
  // Only USOAP > PEL has real data for now. Everything else renders as a
  // not-configured placeholder. When additional Activities or Sections come
  // online, extend the matrix below and the rest flows from src/lib/nav.ts.
  const all = await prisma.protocolQuestion.findMany({
    select: { status: true },
  });
  const pelSummary = summarize(all.map((p) => p.status));

  const cellFor = (
    activityId: ActivityId,
    sectionId: SectionId
  ): CellStatus => {
    if (activityId === "usoap" && sectionId === "pel") {
      return {
        kind: "live",
        href: "/usoap-pel",
        pct: pelSummary.completePct,
        done: pelSummary.byStatus.COMPLETE,
        total: pelSummary.total,
        inProgress:
          pelSummary.byStatus.IN_PROGRESS +
          pelSummary.byStatus.NEEDS_WORK +
          pelSummary.byStatus.UNDER_REVIEW,
      };
    }
    return { kind: "not_configured" };
  };

  // Fleet-wide aggregates shown in the hero strip.
  const liveCells = ACTIVITIES.flatMap((a) =>
    SECTIONS.map((s) => ({ a: a.id, s: s.id, cell: cellFor(a.id, s.id) }))
  ).filter((c) => c.cell.kind === "live") as Array<{
    a: ActivityId;
    s: SectionId;
    cell: Extract<CellStatus, { kind: "live" }>;
  }>;

  const totalConfigured = liveCells.length;
  const totalPossible = ACTIVITIES.length * SECTIONS.length;
  const totalPQs = liveCells.reduce((sum, c) => sum + c.cell.total, 0);
  const totalDone = liveCells.reduce((sum, c) => sum + c.cell.done, 0);

  return (
    <div className="max-w-7xl">
      <header className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Aviation Compliance Systems
        </div>
        <h1 className="text-3xl font-semibold text-ink-50 mt-1 tracking-tight">
          Flight Safety Department
        </h1>
        <p className="text-sm text-ink-300 mt-1">
          Central hub for compliance, surveillance and organizational trackers.
          Signed in as <span className="text-ink-100">Asim Mairaj</span>.
        </p>
      </header>

      {/* Fleet-wide strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <HeroStat
          label="Trackers online"
          value={`${totalConfigured}/${totalPossible}`}
          sub="Activity · Section pairs"
        />
        <HeroStat
          label="Items under management"
          value={totalPQs.toString()}
          sub="across live trackers"
        />
        <HeroStat
          label="Completed"
          value={totalDone.toString()}
          sub={
            totalPQs > 0
              ? `${Math.round((totalDone / totalPQs) * 100)}% of live items`
              : "no live items yet"
          }
          accent="emerald"
        />
        <HeroStat
          label="Placeholders"
          value={`${totalPossible - totalConfigured}`}
          sub="awaiting configuration"
          muted
        />
      </div>

      {/* Activities grid. Each card is one Activity; each row inside is one
          Section. Same shape for every card so the eye can skim quickly. */}
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-base font-semibold text-ink-100">Activities</h2>
        <div className="text-[11px] text-ink-500">
          Click a section to open its tracker
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ACTIVITIES.map((activity) => {
          const Icon = activity.icon;
          const configured = SECTIONS.filter(
            (s) => cellFor(activity.id, s.id).kind === "live"
          ).length;

          return (
            <section
              key={activity.id}
              className="relative rounded-lg border border-white/5 bg-ink-900/60 shadow-panel overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start gap-3 p-5 border-b border-white/5">
                <div className="shrink-0 w-9 h-9 rounded-md bg-white/[0.04] border border-white/5 grid place-items-center">
                  <Icon size={16} className="text-ink-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    Activity
                  </div>
                  <div className="text-base font-semibold text-ink-50 leading-tight">
                    {activity.label}
                  </div>
                  {activity.sublabel && (
                    <div className="text-[11px] text-ink-400 mt-0.5">
                      {activity.sublabel}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    Online
                  </div>
                  <div className="text-sm font-semibold text-ink-100 tabular-nums">
                    {configured}/{SECTIONS.length}
                  </div>
                </div>
              </div>

              {/* Section rows */}
              <div className="divide-y divide-white/5">
                {SECTIONS.map((section) => {
                  const cell = cellFor(activity.id, section.id);
                  return <SectionRow key={section.id} section={section} cell={cell} />;
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* A single "next step" rail since there is effectively one working path
          today. Keeps the demo on-message. */}
      <section className="mt-10 rounded-lg border border-white/5 bg-ink-900/40 p-5 shadow-panel">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
          Recommended
        </div>
        <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-base font-semibold text-ink-50">
              Open the USOAP CMA tracker for Personnel Licensing
            </div>
            <div className="text-sm text-ink-300 mt-0.5">
              100 Protocol Questions, 34 Priority PQs, 7 Critical Elements.
            </div>
          </div>
          <Link
            href="/usoap-pel"
            className="inline-flex items-center gap-2 rounded-md border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-200 hover:bg-brand-500/15 transition-colors"
          >
            Open tracker <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionRow({
  section,
  cell,
}: {
  section: (typeof SECTIONS)[number];
  cell: CellStatus;
}) {
  if (cell.kind === "not_configured") {
    return (
      <div
        aria-disabled
        title="Not configured"
        className="flex items-center gap-3 px-5 py-3 opacity-60"
      >
        <CircleDashed size={14} className="shrink-0 text-ink-500" />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-ink-300 leading-tight">
            {section.label}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-ink-500 mt-0.5">
            {section.annexLabel}
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500">
          not configured
        </div>
      </div>
    );
  }

  const complete = cell.pct >= 100;
  const started = cell.done > 0 || cell.inProgress > 0;
  const Indicator = complete
    ? CheckCircle2
    : started
      ? CircleDot
      : CircleDashed;
  const indicatorClass = complete
    ? "text-emerald-300"
    : started
      ? "text-sky-300"
      : "text-ink-400";

  return (
    <Link
      href={cell.href}
      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
    >
      <Indicator size={14} className={`shrink-0 ${indicatorClass}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink-100 leading-tight flex items-center gap-2">
          {section.label}
          <span className="text-[9px] uppercase tracking-wider text-brand-300/80 border border-brand-400/25 bg-brand-500/10 rounded px-1 py-0.5">
            live
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-ink-500 mt-0.5">
          {section.annexLabel}
        </div>
      </div>
      <div className="shrink-0 w-40">
        <SimpleProgress pct={cell.pct} />
        <div className="mt-1 text-[11px] text-ink-400 text-right tabular-nums">
          {cell.done}/{cell.total} complete · {cell.pct}%
        </div>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 text-ink-500 group-hover:text-brand-300 group-hover:translate-x-0.5 transition"
      />
    </Link>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent,
  muted,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "emerald";
  muted?: boolean;
}) {
  return (
    <div
      className={
        "relative rounded-lg border border-white/5 bg-ink-900/60 p-4 shadow-panel overflow-hidden " +
        (muted ? "opacity-80" : "")
      }
    >
      <div
        aria-hidden
        className={
          "absolute inset-x-0 top-0 h-px " +
          (accent === "emerald"
            ? "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-brand-400/30 to-transparent")
        }
      />
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div
        className={
          "text-2xl font-semibold mt-1 tabular-nums " +
          (accent === "emerald" ? "text-emerald-300" : "text-ink-50")
        }
      >
        {value}
      </div>
      <div className="text-xs text-ink-400 mt-0.5">{sub}</div>
    </div>
  );
}
