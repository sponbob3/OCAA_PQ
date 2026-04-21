"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

type Link = {
  id: string;
  label: string;
  url: string;
  description: string | null;
};

const FIELD =
  "px-3 py-2 text-sm rounded-md border border-white/5 bg-ink-850 text-ink-100 " +
  "placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40";

export function EvidenceLinks({
  pqNo,
  initial,
}: {
  pqNo: string;
  initial: Link[];
}) {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>(initial);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pqs/${pqNo}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, url, description: description || null }),
      });
      if (!res.ok) throw new Error("Failed");
      const created: Link = await res.json();
      setLinks((prev) => [...prev, created]);
      setLabel("");
      setUrl("");
      setDescription("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/pqs/${pqNo}/evidence?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      setLinks((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {links.length === 0 && (
        <div className="text-sm text-ink-400 italic">
          No evidence attached yet.
        </div>
      )}

      <ul className="space-y-2">
        {links.map((l) => (
          <li
            key={l.id}
            className="flex items-start justify-between gap-3 p-3 rounded-md border border-white/5 bg-ink-900/60"
          >
            <div className="min-w-0 flex-1">
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 hover:underline"
              >
                {l.label}
                <ExternalLink size={12} />
              </a>
              <div className="text-xs text-ink-500 truncate">{l.url}</div>
              {l.description && (
                <div className="text-sm text-ink-300 mt-1">{l.description}</div>
              )}
            </div>
            <button
              onClick={() => removeLink(l.id)}
              disabled={busy}
              className="p-1.5 text-ink-500 hover:text-rose-400 rounded transition-colors"
              aria-label="Delete evidence link"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={addLink}
        className="rounded-md border border-dashed border-white/10 bg-ink-900/40 p-3 space-y-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. CAR-FCL Reg.)"
            className={FIELD}
            required
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={FIELD}
            required
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className={`${FIELD} w-full`}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm"
        >
          <Plus size={14} />
          Add evidence
        </button>
      </form>
    </div>
  );
}
