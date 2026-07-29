"use client";

import { Item } from "@/lib/api";

/**
 * AI-suggested items the source documents seem to be missing (e.g. an open
 * question with no owner). These are never auto-added to the project — the
 * user must explicitly select one (checkbox) to include it in the saved
 * summary, same as any other extracted item.
 */
export function SuggestionsPanel({
  suggestions,
  selectedIds,
  onToggleSelect,
}: {
  suggestions: Item[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border border-violet-500/30 bg-violet-500/5 p-5">
      <h2 className="mb-1.5 font-semibold tracking-tight text-violet-700 dark:text-violet-400">
        AI-suggested missing items
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        These are not extracted from any document — they are suggestions for gaps the AI noticed.
        Select the checkbox to include a suggestion in your reviewed summary; nothing here is saved
        automatically.
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2.5 text-sm shadow-sm"
          >
            <input
              type="checkbox"
              className="mt-1 h-3.5 w-3.5 rounded border-input accent-violet-600"
              checked={selectedIds.has(s.id)}
              onChange={() => onToggleSelect(s.id)}
            />
            <span>
              <span className="mr-2 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                {s.item_type.replaceAll("_", " ")}
              </span>
              {s.content}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
