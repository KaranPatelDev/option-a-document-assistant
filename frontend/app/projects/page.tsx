"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Project } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";

export default function ProjectsListPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight">Your Projects</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Upload up to three project documents, review the AI&apos;s extracted facts, decisions,
          risks, and action items, then save a reviewed summary.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-10 flex gap-2">
        <Input
          className="flex-1"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? "Creating…" : "Create project"}
        </Button>
      </form>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {projects === null && !error && <p className="text-sm text-muted-foreground">Loading projects…</p>}
      {projects !== null && projects.length === 0 && (
        <Card dashed className="py-10">
          No projects yet — create one above to get started.
        </Card>
      )}

      <ul className="space-y-2">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`}>
              <Card className="flex items-center justify-between transition-all hover:border-ring/40 hover:shadow-md">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
