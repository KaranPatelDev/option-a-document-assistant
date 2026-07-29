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
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Document-to-Action Project Assistant</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Upload up to three project documents, review the AI&apos;s extracted facts, decisions,
          risks, and action items, then save a reviewed summary.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-10 flex gap-2">
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {projects === null && !error && <p className="text-sm text-muted-foreground">Loading projects…</p>}
      {projects !== null && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
          No projects yet — create one above to get started.
        </div>
      )}

      <ul className="space-y-2">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-ring/40 hover:shadow-md"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(p.created_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
