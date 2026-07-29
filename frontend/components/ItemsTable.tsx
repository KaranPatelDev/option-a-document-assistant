"use client";

import { useState } from "react";
import { api, Item, ItemStatus, ItemType } from "@/lib/api";
import { ActionItemControls } from "./ActionItemControls";

const TABS: { key: ItemType; label: string }[] = [
  { key: "fact", label: "Facts" },
  { key: "decision", label: "Decisions" },
  { key: "assumption", label: "Assumptions" },
  { key: "risk", label: "Risks" },
  { key: "open_question", label: "Open Questions" },
  { key: "action_item", label: "Action Items" },
];

const STATUS_OPTIONS: ItemStatus[] = ["confirmed", "assumption", "unresolved"];

function ItemRow({
  item,
  onChange,
  selected,
  onToggleSelect,
}: {
  item: Item;
  onChange: (updated: Item) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [saving, setSaving] = useState(false);

  async function saveContent() {
    setSaving(true);
    try {
      const updated = await api.updateItem(item.id, { content: draft });
      onChange(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: ItemStatus) {
    const updated = await api.updateItem(item.id, { status });
    onChange(updated);
  }

  return (
    <li className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          title="Include in saved summary"
        />
        <div className="flex-1">
          {item.is_ai_suggestion && (
            <span className="mb-1 inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              AI suggestion — not from a document
            </span>
          )}
          {editing ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveContent}
                  disabled={saving}
                  className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setDraft(item.content);
                    setEditing(false);
                  }}
                  className="rounded bg-slate-200 px-2 py-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-800">{item.content}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Source: {item.document_filename ?? "—"}
              {item.section_ref ? ` · ${item.section_ref}` : ""}
            </span>
            <span>Confidence: {Math.round(item.ai_confidence * 100)}%</span>
            {item.conflict_group_id && (
              <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                ⚠ has conflict
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs text-slate-600 underline">
                Edit
              </button>
            )}
            <select
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={item.status}
              onChange={(e) => changeStatus(e.target.value as ItemStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {item.item_type === "action_item" && <ActionItemControls item={item} onChange={onChange} />}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ItemsTable({
  items,
  onChange,
  selectedIds,
  onToggleSelect,
}: {
  items: Item[];
  onChange: (updated: Item) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<ItemType>("fact");
  const filtered = items.filter((i) => i.item_type === tab);

  return (
    <section>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = items.filter((i) => i.item_type === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded px-3 py-1.5 text-sm ${
                tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No {tab.replaceAll("_", " ")} items yet.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onChange={onChange}
              selected={selectedIds.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
