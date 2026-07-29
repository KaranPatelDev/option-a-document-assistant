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
    <section className="rounded border border-slate-200 bg-white p-4 mb-6">
      <h2 className="font-medium mb-3">
        Documents ({documents.length}/{MAX_DOCUMENTS})
      </h2>

      {documents.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">No documents uploaded yet.</p>
      )}

      <ul className="mb-4 space-y-1">
        {documents.map((d) => (
          <li key={d.id} className="text-sm flex items-center justify-between rounded bg-slate-50 px-3 py-2">
            <span>{d.filename}</span>
            <span className="text-slate-500">
              {d.doc_type.replaceAll("_", " ")} ({Math.round(d.doc_type_confidence * 100)}%)
            </span>
          </li>
        ))}
      </ul>

      {!atLimit && (
        <div className="space-y-2 mb-3">
          <input type="file" accept=".txt,.md" onChange={handleFile} className="block text-sm" />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filename (e.g. meeting-notes.md)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <textarea
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            rows={6}
            placeholder="Or paste document text here"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Add document"}
          </button>
        </div>
      )}

      {atLimit && <p className="text-sm text-slate-500 mb-3">Maximum of {MAX_DOCUMENTS} documents reached.</p>}

      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button
        onClick={onAnalyze}
        disabled={documents.length === 0 || analyzing}
        className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {analyzing ? "Analyzing…" : "Analyze documents"}
      </button>
    </section>
  );
}
