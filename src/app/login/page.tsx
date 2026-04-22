import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, UserPlus, LogIn } from "lucide-react";
import {
  ADMIN_USER_ID,
  CURRENT_USER_COOKIE,
  DEFAULT_EDITOR_USER_ID,
  DEMO_USERS,
  ensureDemoUsers,
} from "@/lib/current-user";

async function loginAs(userId: string) {
  await ensureDemoUsers();
  const store = await cookies();
  store.set(CURRENT_USER_COOKIE, userId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/flight-safety");
}

async function adminLogin() {
  "use server";
  await loginAs(ADMIN_USER_ID);
}

async function editorLogin() {
  "use server";
  await loginAs(DEFAULT_EDITOR_USER_ID);
}

const DEFAULT_EDITOR = DEMO_USERS.find(
  (u) => u.id === DEFAULT_EDITOR_USER_ID
)!;

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Brand block */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.5)]" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-400">
              Aviation Compliance Systems
            </span>
          </div>
          <h1 className="text-4xl font-semibold text-ink-50 tracking-tight">
            Aviation Compliance Systems
          </h1>
          <p className="text-sm text-ink-300 mt-2">
            Asim Management Protocol
          </p>
        </div>

        {/* Primary: Admin login. Server action sets the current-user cookie
            before redirecting, so the app boots into the admin persona. */}
        <form action={adminLogin}>
          <button
            type="submit"
            className="group w-full block text-left rounded-xl border border-white/5 bg-ink-900/70 shadow-panel overflow-hidden transition-colors hover:border-brand-400/30 hover:bg-ink-900/90 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
          >
            <div className="relative p-5">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent"
              />
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-400/30 grid place-items-center">
                  <ShieldCheck size={18} className="text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-brand-300/80">
                    Admin Login
                  </div>
                  <div className="text-lg font-semibold text-ink-50 leading-tight">
                    Asim Mairaj
                  </div>
                  <div className="text-[11px] text-ink-400 mt-0.5">
                    Department of Flight Safety
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-300"
                />
              </div>
            </div>
          </button>
        </form>

        {/* Secondary actions: Register is a placeholder; Login signs in as
            the default editor persona (switchable from the sidebar). */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PlaceholderButton icon={UserPlus} label="Register" />
          <form action={editorLogin} className="contents">
            <button
              type="submit"
              title={`Sign in as ${DEFAULT_EDITOR.name} (Editor)`}
              className="group flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-ink-900/60 px-4 py-2.5 text-sm text-ink-200 hover:text-ink-50 hover:border-brand-400/30 hover:bg-ink-900/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            >
              <LogIn size={14} className="text-ink-400 group-hover:text-brand-300 transition-colors" />
              Login
            </button>
          </form>
        </div>
        <p className="mt-2 text-center text-[10px] text-ink-500">
          Login signs you in as {DEFAULT_EDITOR.name.split(" ")[0]} · Editor.
          Switch personas from the sidebar once inside.
        </p>

        <p className="mt-8 text-center text-[11px] text-ink-500">
          Register is a placeholder during the current preview.
        </p>
      </div>
    </div>
  );
}

function PlaceholderButton({
  icon: Icon,
  label,
}: {
  icon: typeof UserPlus;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title="Not available in the current preview"
      className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-ink-900/40 px-4 py-2.5 text-sm text-ink-400 cursor-not-allowed"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
