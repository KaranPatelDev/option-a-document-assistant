"use client";

import { ActionStatus, api, Item } from "@/lib/api";

const BADGE: Record<ActionStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  proposed: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  edited: "bg-blue-100 text-blue-800",
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
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[item.action_status]}`}>
        {item.action_status}
      </span>
      {item.action_status === "proposed" && (
        <>
          <button
            onClick={() => setStatus("approved")}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white"
          >
            Approve
          </button>
          <button
            onClick={() => setStatus("rejected")}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Reject
          </button>
        </>
      )}
      {item.action_status === "approved" && (
        <button
          onClick={() => setStatus("rejected")}
          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
        >
          Undo → Reject
        </button>
      )}
      {item.action_status === "rejected" && (
        <button
          onClick={() => setStatus("proposed")}
          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
        >
          Reconsider
        </button>
      )}
    </div>
  );
}
