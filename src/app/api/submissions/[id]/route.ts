import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/current-user";

// Admin-only hard delete. The per-(pq, field) `seq` is not renumbered on
// delete: surviving submissions keep their original numbers so cross-thread
// references in `revisesIdsJson` remain meaningful in the audit log. A new
// submission appended after a delete may re-use the previous max seq, which
// is an acceptable tradeoff for staying simple.
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
  // Editor-deletes-own is not implemented yet. For now every delete requires
  // admin role. When per-author delete lands, this gate widens to `user.id
  // === target.authorId || isAdmin(user)`.
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const target = await prisma.fieldSubmission.findUnique({
    where: { id },
    select: { id: true, isInitial: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  // Initial-template rows (imported from the source workbook) are
  // intentionally immutable. Admins and reset scripts must revise them
  // instead of deleting.
  if (target.isInitial) {
    return NextResponse.json(
      {
        error:
          "This is an initial template entry and cannot be deleted. Revise it instead.",
      },
      { status: 409 }
    );
  }

  await prisma.fieldSubmission.delete({ where: { id } });
  return NextResponse.json({ ok: true, id });
}
