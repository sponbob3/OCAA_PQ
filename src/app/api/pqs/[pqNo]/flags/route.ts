// Admin-only toggle for the manually-assignable PQ flags (PPQ, ATC).
//
// The flags are first populated by `npm run db:seed:static` from the
// source workbook, but admins can override them per PQ from the detail
// page. Manual overrides persist across future reseeds because
// `scripts/seed.ts` no longer includes isPPQ / isATC in the update
// branch of its upsert.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/current-user";

type Flag = "PPQ" | "ATC";

type Body = {
  flag?: Flag;
  value?: boolean;
};

function fieldFor(flag: Flag): "isPPQ" | "isATC" {
  return flag === "PPQ" ? "isPPQ" : "isATC";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;

  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.flag !== "PPQ" && body.flag !== "ATC") {
    return NextResponse.json(
      { error: "flag must be 'PPQ' or 'ATC'" },
      { status: 400 }
    );
  }
  if (typeof body.value !== "boolean") {
    return NextResponse.json(
      { error: "value must be a boolean" },
      { status: 400 }
    );
  }

  const existing = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    select: { id: true, isPPQ: true, isATC: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  const column = fieldFor(body.flag);
  const updated = await prisma.protocolQuestion.update({
    where: { pqNo },
    data: { [column]: body.value, updatedById: user.id },
    select: { pqNo: true, isPPQ: true, isATC: true },
  });

  return NextResponse.json(updated);
}
