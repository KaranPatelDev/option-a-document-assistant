import Link from "next/link";
import { buttonVariants } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Doc Assistant
        </Link>
        <Link href="/projects" className={buttonVariants("primary", "sm")}>
          Open app
        </Link>
      </div>
    </header>
  );
}
