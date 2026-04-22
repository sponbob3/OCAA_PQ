import Link from "next/link";
import type { ProtocolQuestion } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight, RadioTower, Star } from "lucide-react";

export function PQCard({ pq }: { pq: ProtocolQuestion }) {
  return (
    <Link
      href={`/pqs/${pq.pqNo}`}
      className="group block rounded-lg border border-white/5 bg-ink-900/60 p-4 transition hover:border-brand-500/40 hover:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-ink-400 mb-1">
            <span className="font-mono text-ink-300">PQ {pq.pqNo}</span>
            <span className="text-ink-600">·</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-ink-200 text-xs font-medium border border-white/5">
              {pq.ce}
            </span>
            {pq.isPPQ && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-400/25">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                PPQ
              </span>
            )}
            {pq.isATC && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 text-xs font-medium border border-sky-400/25">
                <RadioTower size={10} />
                ATC
              </span>
            )}
          </div>
          <p className="text-ink-100 text-sm leading-snug line-clamp-2">
            {pq.question}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={pq.status} />
          <ChevronRight
            size={16}
            className="text-ink-500 transition-colors group-hover:text-brand-400"
          />
        </div>
      </div>
    </Link>
  );
}
