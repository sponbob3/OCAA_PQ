import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/current-user";

// Approve the submission identified by :id as the "final" submission for its
// (pq, field) thread. Clears any prior approval on the same thread so exactly
// one submission is approved at a time.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const target = await prisma.fieldSubmission.findUnique({
    where: { id },
    select: { id: true, pqId: true, fieldKey: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.fieldSubmission.updateMany({
      where: {
        pqId: target.pqId,
        fieldKey: target.fieldKey,
        NOT: { id },
        approvedAt: { not: null },
      },
      data: { approvedAt: null, approvedById: null },
    });
    return tx.fieldSubmission.update({
      where: { id },
      data: { approvedAt: now, approvedById: user.id },
      include: {
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const target = await prisma.fieldSubmission.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const updated = await prisma.fieldSubmission.update({
    where: { id },
    data: { approvedAt: null, approvedById: null },
  });
  return NextResponse.json(updated);
}
