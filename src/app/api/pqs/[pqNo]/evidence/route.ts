import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/current-user";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;

  let body: { label?: string; url?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.label || !body.url) {
    return NextResponse.json(
      { error: "label and url are required" },
      { status: 400 }
    );
  }

  const pq = await prisma.protocolQuestion.findUnique({ where: { pqNo } });
  if (!pq) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  const user = await getCurrentUser();

  const link = await prisma.evidenceLink.create({
    data: {
      pqId: pq.id,
      label: body.label,
      url: body.url,
      description: body.description ?? null,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json(link, { status: 201 });
}

// Delete policy mirrors FieldSubmission: admin-only for now. When the
// "editors can delete their own" path lands, this widens to an
// owner-or-admin check.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const link = await prisma.evidenceLink.findUnique({ where: { id } });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pq = await prisma.protocolQuestion.findUnique({ where: { pqNo } });
  if (!pq || pq.id !== link.pqId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.evidenceLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
