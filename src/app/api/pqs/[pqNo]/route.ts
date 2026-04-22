import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";
import { STATUS_META } from "@/lib/constants";
import { getCurrentUser } from "@/lib/current-user";

const VALID_STATUSES = Object.keys(STATUS_META) as Status[];

// PATCH is now status-only. All text-field content moved to the append-only
// FieldSubmission model and is written through /api/pqs/:pqNo/submissions.
type PatchBody = Partial<{
  status: Status;
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

  if (!body.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  const user = await getCurrentUser();

  const updated = await prisma.$transaction(async (tx) => {
    const pq = await tx.protocolQuestion.update({
      where: { pqNo },
      data: { status: body.status, updatedById: user.id },
    });

    if (body.status && body.status !== existing.status) {
      await tx.statusHistory.create({
        data: {
          pqId: existing.id,
          fromStatus: existing.status,
          toStatus: body.status,
          note: emptyToNull(body.statusChangeNote),
          changedById: user.id,
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
      evidenceLinks: {
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
      },
      statusHistory: { orderBy: { changedAt: "desc" } },
      fieldSubmissions: {
        orderBy: [{ fieldKey: "asc" }, { seq: "desc" }],
        include: {
          author: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });
  if (!pq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pq);
}
