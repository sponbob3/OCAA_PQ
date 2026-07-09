// Admin-only management of which PEL sub-areas are "enabled" on a
// particular PQ. Body:
//   { key: FieldKey, enabled: boolean }
//
// The key must be one of the PEL sub-area FieldKey values. On success
// the route stores the canonicalized list back on the PQ row and
// returns the new enabled set so clients don't have to reconcile.

import { NextResponse } from "next/server";
import type { FieldKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/current-user";
import {
  PEL_SUB_AREA_FIELD_KEYS,
  isPelSubAreaField,
  resolveEnabledPelSubAreas,
  stringifyEnabledPelSubAreas,
} from "@/lib/pel";

type Body = { key?: string; enabled?: boolean };

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

  if (typeof body.key !== "string" || !isPelSubAreaField(body.key as FieldKey)) {
    return NextResponse.json(
      { error: `key must be one of ${PEL_SUB_AREA_FIELD_KEYS.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 }
    );
  }

  const key = body.key as FieldKey;

  const pq = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    select: {
      id: true,
      enabledPelSubAreasJson: true,
      // Field keys with at least one submission, used to resolve the
      // implicit set when no JSON override is stored yet.
      fieldSubmissions: {
        where: { fieldKey: { in: PEL_SUB_AREA_FIELD_KEYS } },
        select: { fieldKey: true },
        distinct: ["fieldKey"],
      },
    },
  });
  if (!pq) {
    return NextResponse.json({ error: "PQ not found" }, { status: 404 });
  }

  const current = new Set(
    resolveEnabledPelSubAreas(
      pq.enabledPelSubAreasJson,
      pq.fieldSubmissions.map((s) => s.fieldKey)
    )
  );

  if (body.enabled) current.add(key);
  else current.delete(key);

  const nextJson = stringifyEnabledPelSubAreas(Array.from(current));

  await prisma.protocolQuestion.update({
    where: { id: pq.id },
    data: {
      enabledPelSubAreasJson: nextJson,
      updatedById: user.id,
    },
  });

  return NextResponse.json({
    pqNo,
    enabled: JSON.parse(nextJson) as FieldKey[],
  });
}
