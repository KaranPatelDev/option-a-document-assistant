"use client";

import { useState } from "react";
import { api, Item, ItemStatus, ItemType } from "@/lib/api";
import { ActionItemControls } from "./ActionItemControls";
import { Badge, Button, Card, Select, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";

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
  const [error, setError] = useState<string | null>(null);

  async function saveContent() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateItem(item.id, { content: draft });
      onChange(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: ItemStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateItem(item.id, { status });
      onChange(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="li" className="p-4 transition-colors hover:border-ring/30">
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
            <Badge tone="violet" className="mb-1.5">
              AI suggestion — not from a document
            </Badge>
          )}
          {editing ? (
            <div className="space-y-2">
              <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveContent} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDraft(item.content);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
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
            {item.conflict_group_id && <Badge tone="warning">⚠ has conflict</Badge>}
          </div>

          {item.related_standards.length > 0 && (
            <ul className="mt-2 space-y-1 border-l-2 border-blue-500/40 pl-2.5 text-xs text-muted-foreground">
              {item.related_standards.map((s) => (
                <li key={s}>📋 {s}</li>
              ))}
            </ul>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Edit
              </button>
            )}
            <Select
              className="px-2 py-1 text-xs"
              value={item.status}
              disabled={saving}
              onChange={(e) => changeStatus(e.target.value as ItemStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {item.item_type === "action_item" && <ActionItemControls item={item} onChange={onChange} />}
          </div>

          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>
    </Card>
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
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} <span className={active ? "text-muted-foreground" : ""}>({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card dashed className="py-8">No {tab.replaceAll("_", " ")} items yet.</Card>
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
