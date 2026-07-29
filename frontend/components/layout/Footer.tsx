import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <span>Document-to-Action Project Assistant — AI extraction with human review.</span>
        <Link href="/" className="underline-offset-2 hover:text-foreground hover:underline">
          Back to home
        </Link>
      </div>
    </footer>
  );
}
