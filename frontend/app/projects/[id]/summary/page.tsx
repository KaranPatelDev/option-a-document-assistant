"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, Item, Summary } from "@/lib/api";

function groupByType(items: Item[]) {
  const groups: Record<string, Item[]> = {};
  for (const item of items) {
    groups[item.item_type] = groups[item.item_type] || [];
    groups[item.item_type].push(item);
  }
  return groups;
}

export default function SummaryPage() {
  const searchParams = useSearchParams();
  const summaryId = searchParams.get("summaryId");
  const justSaved = searchParams.get("saved") === "1";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!summaryId) return;
    api
      .getSummary(summaryId)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load summary"));
  }, [summaryId]);

  if (!summaryId)
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        No summary specified.
      </div>
    );
  if (error)
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  if (!summary) return <p className="text-sm text-muted-foreground">Loading summary…</p>;

  const groups = groupByType(summary.items);

  return (
    <main>
      <a
        href="/projects"
        className="mb-4 inline-block text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        ← All projects
      </a>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Reviewed Project Action Summary</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Saved {new Date(summary.saved_at).toLocaleString()} · every item below links back to its
        source document and section.
      </p>
      {justSaved && (
        <div className="mb-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          ✓ Summary saved successfully.
        </div>
      )}

      {Object.entries(groups).map(([type, groupItems]) => (
        <section key={type} className="mb-6">
          <h2 className="mb-2 font-semibold capitalize tracking-tight">{type.replaceAll("_", " ")}s</h2>
          <ul className="space-y-2.5">
            {groupItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <p className="text-sm leading-relaxed text-foreground">{item.content}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Source: {item.is_ai_suggestion ? "AI suggestion (not sourced from a document)" : item.document_filename ?? "—"}
                  {!item.is_ai_suggestion && item.section_ref ? ` · ${item.section_ref}` : ""} · status: {item.status}
                  {item.item_type === "action_item" ? ` · action: ${item.action_status}` : ""}
                </p>
                {item.related_standards.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 border-l-2 border-blue-500/40 pl-2.5 text-xs text-muted-foreground">
                    {item.related_standards.map((s) => (
                      <li key={s}>📋 {s}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
