"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Project } from "@/lib/api";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setProjects(await api.listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const project = await api.createProject(name.trim());
      setName("");
      await load();
      window.location.href = `/projects/${project.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-1">Document-to-Action Project Assistant</h1>
      <p className="text-slate-600 mb-6">
        Upload up to three project documents, review the AI&apos;s extracted facts, decisions, risks,
        and action items, then save a reviewed summary.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          className="flex-1 rounded border border-slate-300 px-3 py-2"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </form>

      {error && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</div>}

      {projects === null && !error && <p className="text-slate-500">Loading projects…</p>}
      {projects !== null && projects.length === 0 && (
        <p className="text-slate-500">No projects yet — create one above to get started.</p>
      )}

      <ul className="space-y-2">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="block rounded border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-sm text-slate-400">
                {new Date(p.created_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
