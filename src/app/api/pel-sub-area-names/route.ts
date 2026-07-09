// GET /api/pel-sub-area-names
//
// Returns the distinct names that have ever appeared in any PEL
// sub-area FieldSubmission across the whole app. The PQ detail page
// uses this list to power a typeahead / datalist when admins fill in a
// new sub-area input - they almost always want to pick from this set
// (and future user accounts will be created from these names too).
//
// Cheap-to-compute (one indexed query) and small payload, so the route
// is plain Node runtime with no caching tricks.

import { NextResponse } from "next/server";
import { listPelSubAreaNames } from "@/lib/pel-names";

export const dynamic = "force-dynamic";

export async function GET() {
  const names = await listPelSubAreaNames();
  return NextResponse.json({ names });
}
