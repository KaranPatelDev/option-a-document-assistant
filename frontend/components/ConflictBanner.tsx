"use client";

import { useState } from "react";
import { api, Conflict, Item } from "@/lib/api";

export function ConflictBanner({
  conflict,
  items,
  onResolved,
}: {
  conflict: Conflict;
  items: Item[];
  onResolved: (updated: Conflict) => void;
}) {
  const [note, setNote] = useState(conflict.resolution_note || "");
  const [saving, setSaving] = useState(false);

  const involved = items.filter((i) => conflict.item_ids.includes(i.id));

  async function handleResolve() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const updated = await api.resolveConflict(conflict.id, note.trim());
      onResolved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`mb-3 rounded-lg border p-4 ${
        conflict.resolved_by_user
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
        ⚠ Conflict: {conflict.description}
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground/80">
        {involved.map((i) => (
          <li key={i.id}>
            {i.content} <span className="text-muted-foreground">({i.document_filename})</span>
          </li>
        ))}
      </ul>
      {conflict.resolved_by_user ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
          Resolved: {conflict.resolution_note}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Explain how this conflict was resolved"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={handleResolve}
            disabled={saving || !note.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Saving…" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}
