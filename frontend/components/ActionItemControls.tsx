"use client";

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
  async function setStatus(status: ActionStatus) {
    const updated = await api.updateItemAction(item.id, status);
    onChange(updated);
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone={TONE[item.action_status]}>{item.action_status}</Badge>
      {item.action_status === "proposed" && (
        <>
          <Button size="sm" variant="success" onClick={() => setStatus("approved")}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setStatus("rejected")}>
            Reject
          </Button>
        </>
      )}
      {item.action_status === "approved" && (
        <Button size="sm" variant="secondary" onClick={() => setStatus("rejected")}>
          Undo → Reject
        </Button>
      )}
      {item.action_status === "rejected" && (
        <Button size="sm" variant="secondary" onClick={() => setStatus("proposed")}>
          Reconsider
        </Button>
      )}
    </div>
  );
}
