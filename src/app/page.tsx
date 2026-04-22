// Public entry gate. Simple presentation-time passcode wall: the rest
// of the app is only reachable once this form accepts the passcode and
// sets the `acs_gate_ok` cookie. Enforced site-wide by `src/middleware.ts`.
//
// The passcode is read from the `SITE_PASSCODE` env var with a fallback
// to the demo value the user asked for, so it can be rotated without a
// code change in staging/prod.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound, Lock, ArrowRight } from "lucide-react";

const GATE_COOKIE = "acs_gate_ok";
const GATE_COOKIE_VALUE = "1";
const GATE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours per unlock
const DEFAULT_PASSCODE = "tarbela1964";

function configuredPasscode(): string {
  const fromEnv = process.env.SITE_PASSCODE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_PASSCODE;
}

async function unlock(formData: FormData) {
  "use server";
  const submitted = String(formData.get("passcode") ?? "").trim();
  if (submitted !== configuredPasscode()) {
    // Surface the failure via a query param; the page reads it below
    // and renders an inline error. Shape mirrors what Next's built-in
    // form handling would do with a URL redirect.
    redirect("/?e=1");
  }
  const store = await cookies();
  store.set(GATE_COOKIE, GATE_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE_SECONDS,
  });
  redirect("/login");
}

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const hasError = e === "1";

  return (
    <div className="min-h-screen grid place-items-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Brand block, trimmed to match the quieter purpose of this page. */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.5)]" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-400">
              Aviation Compliance Systems
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-50 tracking-tight">
            Restricted preview
          </h1>
          <p className="text-sm text-ink-300 mt-2">
            Enter the passcode to continue.
          </p>
        </div>

        <form
          action={unlock}
          className="rounded-xl border border-white/5 bg-ink-900/70 shadow-panel overflow-hidden"
        >
          <div className="relative p-5">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent"
            />

            <label
              htmlFor="passcode"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2"
            >
              <Lock size={11} />
              Passcode
            </label>

            <div className="relative">
              <KeyRound
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="passcode"
                name="passcode"
                type="password"
                autoFocus
                required
                autoComplete="off"
                spellCheck={false}
                aria-invalid={hasError ? true : undefined}
                aria-describedby={hasError ? "passcode-error" : undefined}
                className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-md bg-ink-850 text-ink-100 placeholder:text-ink-500 border ${
                  hasError
                    ? "border-rose-400/40 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/30"
                    : "border-white/5 focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/40"
                } focus:outline-none transition-colors`}
                placeholder="Enter passcode"
              />
            </div>

            {hasError && (
              <p
                id="passcode-error"
                className="mt-2 text-[11px] text-rose-300"
              >
                Incorrect passcode. Try again.
              </p>
            )}

            <button
              type="submit"
              className="mt-4 group w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium py-2.5 transition-colors shadow-[0_0_0_1px_rgba(59,130,246,0.35)_inset] focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            >
              Continue
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-ink-500">
          This gate exists only for the current preview. Clearing the session
          will require the passcode again.
        </p>
      </div>
    </div>
  );
}
