"use client";

import { useState } from "react";
import { api, Conflict, Item } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { cn } from "@/components/ui/cn";

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
      className={cn(
        "mb-3 rounded-lg border p-4",
        conflict.resolved_by_user
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/40 bg-amber-500/5"
      )}
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
          <Input
            className="flex-1"
            placeholder="Explain how this conflict was resolved"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" onClick={handleResolve} disabled={saving || !note.trim()}>
            {saving ? "Saving…" : "Resolve"}
          </Button>
        </div>
      )}
    </div>
  );
}
