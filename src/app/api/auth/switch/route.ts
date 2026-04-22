import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CURRENT_USER_COOKIE,
  DEMO_USERS,
  ensureDemoUsers,
} from "@/lib/current-user";

// Demo-only persona switcher. Sets the `acs_uid` cookie to one of the
// known demo user IDs. Returns the active user record so the client can
// reflect the switch without an extra round-trip.
export async function POST(req: Request) {
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = new Set(DEMO_USERS.map((u) => u.id));
  const uid = body.userId;
  if (!uid || !allowed.has(uid)) {
    return NextResponse.json({ error: "Unknown user" }, { status: 400 });
  }

  await ensureDemoUsers();
  const store = await cookies();
  store.set(CURRENT_USER_COOKIE, uid, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const user = DEMO_USERS.find((u) => u.id === uid)!;
  return NextResponse.json({ ok: true, user });
}
