import { NextResponse } from "next/server";
import type { FieldKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const VALID_FIELD_KEYS: FieldKey[] = [
  "STATUS_OF_IMPLEMENTATION",
  "MAIN_RESPONSIBILITY",
  "PART_RESPONSIBILITY",
  "FCL",
  "AW",
  "ATC",
  "MED",
  "FOO",
  "SMS",
  "WORK_REQUIRED",
  "BRIEF_ON_WORK_REQUIRED",
  "INTERNAL_NOTES",
  "OCAA_FINAL_RESPONSE",
];

type PostBody = {
  fieldKey?: string;
  value?: string;
  // IDs of prior submissions this one revises. Usually one (the latest),
  // can be several if merging. Validated to belong to the same (pq, field).
  revisesIds?: number[];
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fieldKey = body.fieldKey as FieldKey | undefined;
  if (!fieldKey || !VALID_FIELD_KEYS.includes(fieldKey)) {
    return NextResponse.json({ error: "Invalid fieldKey" }, { status: 400 });
  }

  const value = typeof body.value === "string" ? body.value.trim() : "";
  if (!value) {
    return NextResponse.json(
      { error: "Value cannot be empty" },
      { status: 400 }
    );
  }

  const revisesIds = Array.isArray(body.revisesIds)
    ? body.revisesIds.filter((n) => Number.isInteger(n))
    : [];

  const user = await getCurrentUser();

  const pq = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    select: { id: true, status: true },
  });
  if (!pq) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  // If revisesIds were provided, make sure they really belong to the same
  // (pq, field) thread. Silently drops mismatches rather than failing the
  // request so the UI stays forgiving.
  let cleanRevises: number[] = [];
  if (revisesIds.length > 0) {
    const found = await prisma.fieldSubmission.findMany({
      where: {
        id: { in: revisesIds },
        pqId: pq.id,
        fieldKey,
      },
      select: { id: true },
    });
    cleanRevises = found.map((r) => r.id);
  }

  const submission = await prisma.$transaction(async (tx) => {
    const max = await tx.fieldSubmission.aggregate({
      where: { pqId: pq.id, fieldKey },
      _max: { seq: true },
    });
    const nextSeq = (max._max.seq ?? 0) + 1;

    const created = await tx.fieldSubmission.create({
      data: {
        pqId: pq.id,
        fieldKey,
        seq: nextSeq,
        value,
        revisesIdsJson: JSON.stringify(cleanRevises),
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Auto-transition NOT_STARTED -> IN_PROGRESS on the first real activity
    // against any field on this PQ. Re-read inside the transaction to avoid
    // racing a concurrent status change; only advance if still NOT_STARTED so
    // we don't demote a PQ that was explicitly moved to NEEDS_WORK / COMPLETE.
    const fresh = await tx.protocolQuestion.findUnique({
      where: { id: pq.id },
      select: { status: true },
    });
    if (fresh?.status === "NOT_STARTED") {
      await tx.protocolQuestion.update({
        where: { id: pq.id },
        data: { status: "IN_PROGRESS", updatedById: user.id },
      });
      await tx.statusHistory.create({
        data: {
          pqId: pq.id,
          fromStatus: "NOT_STARTED",
          toStatus: "IN_PROGRESS",
          note: `Auto: first submission on ${fieldKey}`,
          changedById: user.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(submission);
}
