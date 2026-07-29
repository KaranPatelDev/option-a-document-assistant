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
    <section className="mb-6 rounded border border-purple-200 bg-purple-50 p-4">
      <h2 className="mb-2 font-medium text-purple-900">AI-suggested missing items</h2>
      <p className="mb-3 text-sm text-purple-800">
        These are not extracted from any document — they are suggestions for gaps the AI noticed.
        Select the checkbox to include a suggestion in your reviewed summary; nothing here is saved
        automatically.
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-start gap-2 rounded bg-white p-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={selectedIds.has(s.id)}
              onChange={() => onToggleSelect(s.id)}
            />
            <span>
              <span className="mr-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
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
