"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard, ListChecks } from "lucide-react";
import { useState } from "react";
import { ACTIVITIES, SECTIONS, SECTION_ICON } from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  PersonaSwitcher,
  type PersonaOption,
} from "@/components/PersonaSwitcher";

// A few visual helpers kept local so the nav doesn't leak into the rest of
// the component library.

function isPelPath(pathname: string) {
  return (
    pathname === "/usoap-pel" ||
    pathname.startsWith("/usoap-pel/") ||
    pathname === "/pqs" ||
    pathname.startsWith("/pqs/") ||
    pathname === "/ces" ||
    pathname.startsWith("/ces/")
  );
}

// Each Activity leaf drives one row in the sidebar. A given leaf is active
// only when the current route matches one of its configured hrefs (for the
// USOAP>PEL leaf this means any PEL-tree path).
function isActivitySectionActive(
  pathname: string,
  activityId: string,
  sectionId: string,
  href: string | undefined
) {
  if (!href) return false;
  if (activityId === "usoap" && sectionId === "pel") return isPelPath(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  currentUser,
  personaOptions,
}: {
  currentUser: PersonaOption;
  personaOptions: PersonaOption[];
}) {
  const pathname = usePathname() ?? "";

  // The set of expanded Activities. By default USOAP expands automatically
  // when the user is already inside a PEL-tree page so navigation feels
  // continuous; every other node opens on demand.
  const initialOpen = new Set<string>();
  if (isPelPath(pathname) || pathname.startsWith("/usoap-pel")) {
    initialOpen.add("usoap");
  }
  const [open, setOpen] = useState<Set<string>>(initialOpen);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onFlightSafety = pathname === "/flight-safety";

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-ink-925/70 backdrop-blur flex flex-col">
      {/* Brand block */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.5)]" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
            Aviation Compliance Systems
          </div>
        </div>
        <div className="text-lg font-semibold text-ink-50 leading-tight mt-1.5">
          Flight Safety Department
        </div>
        <div className="text-[11px] text-ink-400 mt-0.5">
          Asim Management Protocol
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <NavLeaf
          href="/flight-safety"
          label="Overview"
          icon={LayoutDashboard}
          active={onFlightSafety}
        />

        <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Activities
        </div>

        {ACTIVITIES.map((activity) => {
          const isOpen = open.has(activity.id);
          const anyActive = SECTIONS.some((s) =>
            isActivitySectionActive(
              pathname,
              activity.id,
              s.id,
              activity.sectionHref[s.id]
            )
          );
          const anyEnabled = SECTIONS.some(
            (s) => activity.sectionHref[s.id] != null
          );

          return (
            <div key={activity.id}>
              <button
                type="button"
                onClick={() => toggle(activity.id)}
                className={cn(
                  "w-full flex items-center gap-3 pl-4 pr-3 py-2 rounded-md text-sm transition-colors",
                  anyActive
                    ? "bg-white/[0.04] text-ink-50"
                    : "text-ink-300 hover:text-ink-50 hover:bg-white/[0.03]"
                )}
                aria-expanded={isOpen}
              >
                <activity.icon
                  size={16}
                  className={cn(
                    "shrink-0 transition-colors",
                    anyActive ? "text-brand-400" : "text-ink-400"
                  )}
                />
                <span className="flex-1 text-left truncate">
                  {activity.label}
                </span>
                {!anyEnabled && (
                  <span className="text-[9px] uppercase tracking-wider text-ink-500 border border-white/5 rounded px-1 py-0.5">
                    soon
                  </span>
                )}
                <ChevronRight
                  size={14}
                  className={cn(
                    "text-ink-500 transition-transform",
                    isOpen && "rotate-90"
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 mb-1 ml-5 pl-3 border-l border-white/5 space-y-0.5">
                  {SECTIONS.map((section) => {
                    const href = activity.sectionHref[section.id];
                    const active = isActivitySectionActive(
                      pathname,
                      activity.id,
                      section.id,
                      href
                    );
                    const SectionIcon = SECTION_ICON[section.id];

                    const body = (
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                          !href && "text-ink-500 cursor-not-allowed",
                          href &&
                            !active &&
                            "text-ink-300 hover:text-ink-50 hover:bg-white/[0.03]",
                          active && "bg-white/[0.04] text-ink-50"
                        )}
                      >
                        <SectionIcon
                          size={13}
                          className={cn(
                            "shrink-0",
                            active
                              ? "text-brand-400"
                              : href
                                ? "text-ink-400"
                                : "text-ink-600"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate leading-tight">
                            {section.label}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-ink-500 leading-tight mt-0.5">
                            {section.annexLabel}
                          </div>
                        </div>
                        {!href && (
                          <span className="text-[9px] uppercase tracking-wider text-ink-600">
                            n/a
                          </span>
                        )}
                      </div>
                    );

                    return href ? (
                      <Link key={section.id} href={href}>
                        {body}
                      </Link>
                    ) : (
                      <div
                        key={section.id}
                        aria-disabled
                        title="Not configured yet"
                      >
                        {body}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Contextual sub-nav when inside the PEL tree. Keeps the old
            Dashboard / Protocol Questions affordances from the original app
            without baking them at the top level. */}
        {isPelPath(pathname) && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Personnel Licensing
            </div>
            <NavLeaf
              href="/usoap-pel"
              label="Tracker dashboard"
              icon={LayoutDashboard}
              active={pathname === "/usoap-pel"}
            />
            <NavLeaf
              href="/pqs"
              label="All Protocol Questions"
              icon={ListChecks}
              active={
                pathname === "/pqs" ||
                pathname.startsWith("/pqs/") ||
                pathname.startsWith("/ces/")
              }
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <PersonaSwitcher current={currentUser} options={personaOptions} />
        <div className="mt-2 px-2.5 text-[10px] text-ink-500 flex items-center justify-between">
          <span>Aviation Compliance Systems</span>
          <span className="font-mono">v0.2.0</span>
        </div>
      </div>
    </aside>
  );
}

function NavLeaf({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
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
      <Icon
        size={16}
        className={cn(
          "transition-colors",
          active ? "text-brand-400" : "text-ink-400 group-hover:text-ink-200"
        )}
      />
      {label}
    </Link>
  );
}
