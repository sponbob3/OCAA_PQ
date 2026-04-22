// Site-wide passcode gate for the preview deploy.
//
// Flow:
//   1. Visitor lands on any route without the gate cookie → redirected
//      to `/` where they enter the passcode.
//   2. The gate page's server action verifies the passcode and sets
//      the `acs_gate_ok` cookie, then redirects to `/login`.
//   3. All subsequent requests carry the cookie and pass straight through.
//
// The matcher excludes Next internals and static assets so the gate page
// can actually render (its CSS/fonts must load). The gate page itself
// (`/`) is always allowed — that's where the form and its submit POST
// live.

import { NextResponse, type NextRequest } from "next/server";

const GATE_COOKIE = "acs_gate_ok";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The gate page itself (including its server-action POST) is always
  // reachable so users can actually get past the gate.
  if (pathname === "/") {
    return NextResponse.next();
  }

  if (req.cookies.get(GATE_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the favicon, and anything under /public assets
  // we ship (fonts, branding). Everything else (pages, API routes) goes
  // through the middleware.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|branding/).*)",
  ],
};
