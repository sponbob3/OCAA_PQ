import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "USOAP CMA Tracker",
  description:
    "OCAA tracker for ICAO USOAP CMA Protocol Questions, evidence and status.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased selection:bg-brand-500/40">
        <div className="relative flex min-h-screen">
          {/* Single atmospheric accent. A soft brand bloom fixed to the top
              of the viewport so the dark base reads as a room with a light
              source rather than a flat void. Pointer-events none, no layout. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 h-[420px] -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 70% 0%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(255,255,255,0.015), rgba(255,255,255,0) 30%)",
            }}
          />
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-x-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
