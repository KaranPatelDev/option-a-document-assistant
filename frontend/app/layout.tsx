import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Document-to-Action Project Assistant",
  description: "Extract facts, decisions, risks, and action items from project documents with human review.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
