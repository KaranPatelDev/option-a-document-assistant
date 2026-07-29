"use client";

import { ActionStatus, api, Item } from "@/lib/api";

const BADGE: Record<ActionStatus, string> = {
  none: "bg-muted text-muted-foreground",
  proposed: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  edited: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
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
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[item.action_status]}`}>
        {item.action_status}
      </span>
      {item.action_status === "proposed" && (
        <>
          <button
            onClick={() => setStatus("approved")}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Approve
          </button>
          <button
            onClick={() => setStatus("rejected")}
            className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:opacity-90"
          >
            Reject
          </button>
        </>
      )}
      {item.action_status === "approved" && (
        <button
          onClick={() => setStatus("rejected")}
          className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:opacity-80"
        >
          Undo → Reject
        </button>
      )}
      {item.action_status === "rejected" && (
        <button
          onClick={() => setStatus("proposed")}
          className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:opacity-80"
        >
          Reconsider
        </button>
      )}
    </div>
  );
}
