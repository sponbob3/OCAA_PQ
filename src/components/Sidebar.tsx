"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Star } from "lucide-react";
import { AUDIT_AREA, AUDIT_AREA_FULL } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
};

const LINKS: NavLink[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/",
  },
  {
    href: "/pqs",
    label: "All PQs",
    icon: ListChecks,
    match: (p) => p.startsWith("/pqs") || p.startsWith("/ces"),
  },
  {
    href: "/pqs?ppq=1",
    label: "Priority PQs",
    icon: Star,
    // Query-string driven. Left without an active-state match so navigation
    // stays predictable without pulling useSearchParams into the layout shell.
    match: () => false,
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-ink-925/70 backdrop-blur">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.5)]" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
            OCAA
          </div>
        </div>
        <div className="text-lg font-semibold text-ink-50 leading-tight mt-1.5">
          USOAP CMA Tracker
        </div>
        <div className="text-sm text-ink-300 mt-1">
          {AUDIT_AREA} · {AUDIT_AREA_FULL}
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "group relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-white/[0.04] text-ink-50"
                  : "text-ink-300 hover:text-ink-50 hover:bg-white/[0.03]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1.5 bottom-1.5 w-px rounded-full transition-colors",
                  active ? "bg-brand-400" : "bg-transparent"
                )}
              />
              <l.icon
                size={16}
                className={cn(
                  "transition-colors",
                  active ? "text-brand-400" : "text-ink-400 group-hover:text-ink-200"
                )}
              />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-5 text-[11px] text-ink-500 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span>v0.1.0</span>
          <span className="font-mono text-ink-500">local</span>
        </div>
      </div>
    </aside>
  );
}
