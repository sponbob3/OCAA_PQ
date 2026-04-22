"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { Check, ChevronDown, LogOut, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PersonaOption = {
  id: string;
  name: string;
  role: Role;
};

// Demo persona switcher. Real deployments replace this with a normal
// user menu + sign out. Lives in the sidebar footer so it is always one
// click away from whatever the user is doing.
export function PersonaSwitcher({
  current,
  options,
}: {
  current: PersonaOption;
  options: PersonaOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function pick(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    setPendingId(id);
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error("Switch failed");
      startTransition(() => router.refresh());
      setOpen(false);
    } catch {
      // Swallow; the UI will simply not advance.
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] text-ink-300 hover:text-ink-100 border border-transparent hover:bg-white/[0.03] hover:border-white/5 transition-colors text-left"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold shrink-0",
            current.role === "ADMIN"
              ? "bg-brand-500/20 text-brand-200 border border-brand-400/40"
              : "bg-white/[0.06] text-ink-200 border border-white/10"
          )}
        >
          {initials(current.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-ink-100 truncate text-xs leading-tight">
            {current.name}
          </span>
          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-500 leading-tight">
            {current.role.toLowerCase()}
          </span>
        </span>
        <ChevronDown
          size={12}
          className={cn("transition-transform text-ink-500", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-white/5 bg-ink-900/95 shadow-panel overflow-hidden">
          <div className="px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-ink-500 border-b border-white/5">
            Switch demo persona
          </div>
          {options.map((opt) => {
            const active = opt.id === current.id;
            const loading = pendingId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void pick(opt.id)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors text-left",
                  active
                    ? "bg-white/[0.04] text-ink-100"
                    : "text-ink-300 hover:text-ink-100 hover:bg-white/[0.03]",
                  loading && "opacity-60"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center text-[9px] font-semibold shrink-0",
                    opt.role === "ADMIN"
                      ? "bg-brand-500/20 text-brand-200 border border-brand-400/40"
                      : "bg-white/[0.06] text-ink-200 border border-white/10"
                  )}
                >
                  {initials(opt.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{opt.name}</span>
                <span
                  className={cn(
                    "text-[9px] uppercase tracking-[0.14em] rounded px-1 py-0.5",
                    opt.role === "ADMIN"
                      ? "text-brand-200 border border-brand-400/40 bg-brand-500/10"
                      : "text-ink-400 border border-white/10"
                  )}
                >
                  {opt.role.toLowerCase()}
                </span>
                {active && (
                  <Check size={12} className="text-brand-300 shrink-0" />
                )}
              </button>
            );
          })}
          <a
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-400 hover:text-ink-100 border-t border-white/5 hover:bg-white/[0.03] transition-colors"
          >
            <LogOut size={12} /> Sign out
          </a>
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Unused import guard to keep imports explicit.
export const _iconReserved = User2;
