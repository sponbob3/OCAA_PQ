// Demo-grade current-user resolution.
//
// The preview app does not have real authentication. The login page at `/`
// is cosmetic: clicking "Admin Login" sets the `acs_uid` cookie to the admin
// user's ID, which is what every server action in the app uses to attribute
// writes.
//
// A small roster of demo users is ensured in the database on first call so
// the app works out-of-the-box without requiring a re-seed, and so the admin
// vs editor visual differentiation (badges, approve buttons) has something
// to render against.
//
// Replace `getCurrentUser()` with a NextAuth session read when real auth
// lands; the rest of the app only calls into this module so nothing else
// needs to change.

import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";

export const CURRENT_USER_COOKIE = "acs_uid";

type DemoUserSeed = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

// Stable IDs so cookies survive restarts of the dev server and the roster
// does not depend on cuid generation order.
export const DEMO_USERS: DemoUserSeed[] = [
  {
    id: "user_admin_asim",
    email: "asim.mairaj@ocaa.om",
    name: "Asim Mairaj",
    role: "ADMIN",
  },
  {
    id: "user_editor_hamid",
    email: "hamid.balushi@ocaa.om",
    name: "Hamid Al-Balushi",
    role: "EDITOR",
  },
  {
    id: "user_editor_layla",
    email: "layla.said@ocaa.om",
    name: "Layla Said",
    role: "EDITOR",
  },
];

export const ADMIN_USER_ID = DEMO_USERS[0].id;
// The default "regular user" the public login page signs a visitor in as.
// The rest of the editor roster is reachable through the sidebar persona
// switcher after login.
export const DEFAULT_EDITOR_USER_ID = DEMO_USERS.find(
  (u) => u.role === "EDITOR"
)!.id;

let ensured = false;

export async function ensureDemoUsers() {
  if (ensured) return;
  await Promise.all(
    DEMO_USERS.map((u) =>
      prisma.user.upsert({
        where: { id: u.id },
        update: { email: u.email, name: u.name, role: u.role },
        create: u,
      })
    )
  );
  ensured = true;
}

// Resolves the current user from the cookie. Falls back to the admin user
// when no cookie is present, which keeps the app usable on first visit
// without forcing the user through the fake login. The returned user is
// always a real row in the DB (we ensure demo users on demand).
export async function getCurrentUser(): Promise<User> {
  await ensureDemoUsers();
  const store = await cookies();
  const uid = store.get(CURRENT_USER_COOKIE)?.value;

  if (uid) {
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (user) return user;
  }

  const admin = await prisma.user.findUnique({ where: { id: ADMIN_USER_ID } });
  if (!admin) {
    throw new Error("Admin demo user missing after ensureDemoUsers()");
  }
  return admin;
}

export function isAdmin(user: { role: Role }) {
  return user.role === "ADMIN";
}
