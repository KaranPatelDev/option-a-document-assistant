"use client";

import { useState } from "react";
import { api, Document } from "@/lib/api";

const MAX_DOCUMENTS = 3;

export function UploadPanel({
  projectId,
  documents,
  onUploaded,
  onAnalyze,
  analyzing,
}: {
  projectId: string;
  documents: Document[];
  onUploaded: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const [filename, setFilename] = useState("");
  const [rawText, setRawText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = documents.length >= MAX_DOCUMENTS;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Only .txt or .md files are supported");
      return;
    }
    const text = await file.text();
    setFilename(file.name);
    setRawText(text);
    setError(null);
  }

  async function handleUpload() {
    if (!filename.trim() || !rawText.trim()) {
      setError("Provide a filename and non-empty document text");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await api.uploadDocument(projectId, filename.trim(), rawText);
      setFilename("");
      setRawText("");
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 font-semibold tracking-tight">
        Documents <span className="font-normal text-muted-foreground">({documents.length}/{MAX_DOCUMENTS})</span>
      </h2>

      {documents.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
      )}

      <ul className="mb-4 space-y-1.5">
        {documents.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
          >
            <span className="font-medium">{d.filename}</span>
            <span className="text-muted-foreground">
              {d.doc_type.replaceAll("_", " ")} · {Math.round(d.doc_type_confidence * 100)}%
            </span>
          </li>
        ))}
      </ul>

      {!atLimit && (
        <div className="mb-4 space-y-2.5">
          <input
            type="file"
            accept=".txt,.md"
            onChange={handleFile}
            className="block text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:opacity-80"
          />
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Filename (e.g. meeting-notes.md)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            rows={6}
            placeholder="Or paste document text here"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Add document"}
          </button>
        </div>
      )}

      {atLimit && (
        <p className="mb-4 text-sm text-muted-foreground">Maximum of {MAX_DOCUMENTS} documents reached.</p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={documents.length === 0 || analyzing}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
      >
        {analyzing ? "Analyzing…" : "Analyze documents"}
      </button>
    </section>
  );
}
