import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document-to-Action Project Assistant",
  description: "Extract facts, decisions, risks, and action items from project documents with human review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
