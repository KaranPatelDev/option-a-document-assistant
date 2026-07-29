"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Conflict, Document, Item } from "@/lib/api";
import { UploadPanel } from "@/components/UploadPanel";
import { ConflictBanner } from "@/components/ConflictBanner";
import { ItemsTable } from "@/components/ItemsTable";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [docs, itemList, conflictList] = await Promise.all([
        api.listDocuments(id),
        api.listItems(id),
        api.listConflicts(id),
      ]);
      setDocuments(docs);
      setItems(itemList);
      setConflicts(conflictList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      await api.analyze(id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed — try again");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleItemChange(updated: Item) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleConflictResolved(updated: Conflict) {
    setConflicts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function toggleSelect(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleSaveSummary() {
    if (selectedIds.size === 0) return;
    setSavingSummary(true);
    setError(null);
    try {
      const summary = await api.saveSummary(id, Array.from(selectedIds));
      router.push(`/projects/${id}/summary?summaryId=${summary.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save summary");
    } finally {
      setSavingSummary(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading project…</p>;

  const reviewItems = items.filter((i) => !i.is_ai_suggestion);
  const suggestionItems = items.filter((i) => i.is_ai_suggestion);
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved_by_user);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <a href="/" className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          ← All projects
        </a>
        <button
          onClick={handleSaveSummary}
          disabled={selectedIds.size === 0 || savingSummary}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {savingSummary ? "Saving…" : `Save reviewed summary (${selectedIds.size} selected)`}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <UploadPanel
        projectId={id}
        documents={documents}
        onUploaded={loadAll}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Upload at least one document, then click &quot;Analyze documents&quot; to extract items.
        </p>
      ) : (
        <>
          {unresolvedConflicts.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 font-semibold tracking-tight">Conflicts to resolve ({unresolvedConflicts.length})</h2>
              {conflicts.map((c) => (
                <ConflictBanner key={c.id} conflict={c} items={items} onResolved={handleConflictResolved} />
              ))}
            </section>
          )}

          <SuggestionsPanel
            suggestions={suggestionItems}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />

          <ItemsTable
            items={reviewItems}
            onChange={handleItemChange}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </>
      )}
    </main>
  );
}
