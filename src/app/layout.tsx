import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aviation Compliance Systems",
  description:
    "Aviation Compliance Systems · Asim Management Protocol. USOAP CMA and related compliance trackers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased selection:bg-brand-500/40">
        {/* Ambient wash applied at the root so login and authenticated shells
            sit on the same light source rather than feeling like separate apps. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-[520px] -z-10 opacity-70"
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
        {children}
      </body>
    </html>
  );
}
