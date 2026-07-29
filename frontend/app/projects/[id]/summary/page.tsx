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
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!summaryId) return;
    api
      .getSummary(summaryId)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load summary"));
  }, [summaryId]);

  if (!summaryId) return <p className="text-red-700">No summary specified.</p>;
  if (error) return <div className="rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>;
  if (!summary) return <p className="text-slate-500">Loading summary…</p>;

  const groups = groupByType(summary.items);

  return (
    <main>
      <a href="/" className="mb-4 inline-block text-sm text-slate-500 underline">
        ← All projects
      </a>
      <h1 className="mb-1 text-2xl font-semibold">Reviewed Project Action Summary</h1>
      <p className="mb-6 text-sm text-slate-500">
        Saved {new Date(summary.saved_at).toLocaleString()} · every item below links back to its
        source document and section.
      </p>

      {Object.entries(groups).map(([type, groupItems]) => (
        <section key={type} className="mb-6">
          <h2 className="mb-2 font-medium capitalize">{type.replaceAll("_", " ")}s</h2>
          <ul className="space-y-2">
            {groupItems.map((item) => (
              <li key={item.id} className="rounded border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-800">{item.content}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Source: {item.document_filename ?? "AI suggestion"}
                  {item.section_ref ? ` · ${item.section_ref}` : ""} · status: {item.status}
                  {item.item_type === "action_item" ? ` · action: ${item.action_status}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
