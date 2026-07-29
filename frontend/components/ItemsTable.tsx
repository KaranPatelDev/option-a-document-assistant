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
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-ring/30">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-3.5 w-3.5 rounded border-input accent-primary"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          title="Include in saved summary"
        />
        <div className="flex-1">
          {item.is_ai_suggestion && (
            <span className="mb-1.5 inline-block rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
              AI suggestion — not from a document
            </span>
          )}
          {editing ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveContent}
                  disabled={saving}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setDraft(item.content);
                    setEditing(false);
                  }}
                  className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:opacity-80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground">{item.content}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Source: {item.document_filename ?? "—"}
              {item.section_ref ? ` · ${item.section_ref}` : ""}
            </span>
            <span>Confidence: {Math.round(item.ai_confidence * 100)}%</span>
            {item.conflict_group_id && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                ⚠ has conflict
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Edit
              </button>
            )}
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg bg-secondary/50 p-1">
        {TABS.map((t) => {
          const count = items.filter((i) => i.item_type === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <span className={active ? "text-muted-foreground" : ""}>({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No {tab.replaceAll("_", " ")} items yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
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
