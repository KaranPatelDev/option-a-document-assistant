"use client";

import { useState } from "react";
import { ActionStatus, api, Item } from "@/lib/api";
import { Badge, BadgeTone, Button } from "@/components/ui";

const TONE: Record<ActionStatus, BadgeTone> = {
  none: "neutral",
  proposed: "warning",
  approved: "success",
  rejected: "danger",
  edited: "info",
};

export function ActionItemControls({
  item,
  onChange,
}: {
  item: Item;
  onChange: (updated: Item) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ActionStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateItemAction(item.id, status);
      onChange(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge tone={TONE[item.action_status]}>{item.action_status}</Badge>
        {item.action_status === "proposed" && (
          <>
            <Button size="sm" variant="success" disabled={saving} onClick={() => setStatus("approved")}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={saving} onClick={() => setStatus("rejected")}>
              Reject
            </Button>
          </>
        )}
        {item.action_status === "approved" && (
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => setStatus("rejected")}>
            Undo → Reject
          </Button>
        )}
        {item.action_status === "rejected" && (
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => setStatus("proposed")}>
            Reconsider
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
