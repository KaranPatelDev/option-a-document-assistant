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
      className={`mb-3 rounded border p-3 ${
        conflict.resolved_by_user ? "border-green-200 bg-green-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      <p className="text-sm font-medium text-amber-900">⚠ Conflict: {conflict.description}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
        {involved.map((i) => (
          <li key={i.id}>
            {i.content} <span className="text-slate-400">({i.document_filename})</span>
          </li>
        ))}
      </ul>
      {conflict.resolved_by_user ? (
        <p className="mt-2 text-sm text-green-800">Resolved: {conflict.resolution_note}</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="Explain how this conflict was resolved"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={handleResolve}
            disabled={saving || !note.trim()}
            className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}
