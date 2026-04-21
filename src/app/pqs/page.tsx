import { prisma } from "@/lib/db";
import type { Prisma, Status } from "@prisma/client";
import { FilterBar } from "@/components/FilterBar";
import { PQCard } from "@/components/PQCard";
import { STATUS_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = {
  ce?: string;
  status?: string;
  ppq?: string;
  q?: string;
  sort?: string;
};

export default async function PQsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Prisma.ProtocolQuestionWhereInput = {};
  if (sp.ce) where.ce = sp.ce;
  if (sp.status && sp.status in STATUS_META) where.status = sp.status as Status;
  if (sp.ppq === "1") where.isPPQ = true;
  if (sp.q) {
    where.OR = [
      { question: { contains: sp.q } },
      { pqNo: { contains: sp.q } },
    ];
  }

  const orderBy: Prisma.ProtocolQuestionOrderByWithRelationInput[] =
    sp.sort === "status"
      ? [{ status: "asc" }, { pqNo: "asc" }]
      : sp.sort === "ce"
        ? [{ ce: "asc" }, { pqNo: "asc" }]
        : [{ pqNo: "asc" }];

  const [pqs, ceList] = await Promise.all([
    prisma.protocolQuestion.findMany({ where, orderBy }),
    prisma.protocolQuestion.findMany({
      select: { ce: true },
      distinct: ["ce"],
      orderBy: { ce: "asc" },
    }),
  ]);

  const ces = ceList.map((r) => r.ce);

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
          All Protocol Questions
        </div>
        <h1 className="text-3xl font-semibold text-ink-50 mt-1 tracking-tight">
          PQs
          <span className="ml-3 text-base font-normal text-ink-400 tabular-nums">
            {pqs.length} result{pqs.length === 1 ? "" : "s"}
          </span>
        </h1>
      </header>

      <div className="mb-5">
        <FilterBar ces={ces} />
      </div>

      {pqs.length === 0 ? (
        <div className="text-center py-16 text-ink-400 rounded-lg border border-white/5 bg-ink-900/40">
          No PQs match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          {pqs.map((pq) => (
            <PQCard key={pq.id} pq={pq} />
          ))}
        </div>
      )}
    </div>
  );
}
