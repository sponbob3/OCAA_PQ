import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";
import { STATUS_META } from "@/lib/constants";

const VALID_STATUSES = Object.keys(STATUS_META) as Status[];

type PatchBody = Partial<{
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
  statusChangeNote: string;
}>;

function emptyToNull(v: string | undefined) {
  if (v === undefined) return undefined;
  return v.trim() === "" ? null : v;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const pq = await tx.protocolQuestion.update({
      where: { pqNo },
      data: {
        status: body.status,
        statusOfImplementation: emptyToNull(body.statusOfImplementation),
        mainResponsibility: emptyToNull(body.mainResponsibility),
        partResponsibility: emptyToNull(body.partResponsibility),
        fcl: emptyToNull(body.fcl),
        aw: emptyToNull(body.aw),
        atc: emptyToNull(body.atc),
        med: emptyToNull(body.med),
        workRequired: emptyToNull(body.workRequired),
        briefOnWorkRequired: emptyToNull(body.briefOnWorkRequired),
        internalNotes: emptyToNull(body.internalNotes),
      },
    });

    if (body.status && body.status !== existing.status) {
      await tx.statusHistory.create({
        data: {
          pqId: existing.id,
          fromStatus: existing.status,
          toStatus: body.status,
          note: emptyToNull(body.statusChangeNote),
        },
      });
    }

    return pq;
  });

  return NextResponse.json(updated);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;
  const pq = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    include: {
      evidenceLinks: true,
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!pq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pq);
}
