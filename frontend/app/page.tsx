import Link from "next/link";
import { Card, buttonVariants } from "@/components/ui";

const FEATURES = [
  {
    title: "Multi-document extraction",
    body: "Upload up to three project documents and get facts, decisions, assumptions, risks, open questions, and action items extracted automatically — each one traced back to its exact source document and section.",
  },
  {
    title: "Conflict detection",
    body: "When two documents disagree — different owners, contradictory statements — the assistant flags the conflict so you resolve it explicitly, instead of silently picking one side for you.",
  },
  {
    title: "Human-approval workflow",
    body: "Every extracted item can be edited, its status changed, or an AI suggestion accepted or rejected. Nothing reaches your final summary without your review and explicit selection.",
  },
];

const STEPS = [
  { title: "Create a project", body: "Name it and you're in the review workspace." },
  { title: "Upload & analyze", body: "Drop in your documents and click Analyze." },
  { title: "Review & resolve", body: "Edit items, resolve conflicts, accept AI suggestions." },
  { title: "Save your summary", body: "Select the items that matter and save a reviewed summary." },
];

export default function LandingPage() {
  return (
    <main>
      <section className="py-10 text-center sm:py-16">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn project documents into reviewed, actionable decisions.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Upload your project documents, let AI extract facts, decisions, risks, assumptions and
          action items with citations, resolve conflicts between sources, and save a
          human-reviewed summary you can trust.
        </p>
        <div className="mt-8">
          <Link href="/projects" className={buttonVariants("primary", "lg")}>
            Create a project
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-6">
            <h3 className="font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </Card>
        ))}
      </section>

      <section className="py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-card/50 p-5">
              <span className="text-sm font-medium text-muted-foreground">Step {i + 1}</span>
              <h3 className="mt-1 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-card py-10 text-center shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to review your first project?</h2>
        <div className="mt-6">
          <Link href="/projects" className={buttonVariants("primary", "lg")}>
            Create a project
          </Link>
        </div>
      </section>
    </main>
  );
}
