import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Personal performance operating system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 min-h-screen">
        <main className="max-w-md mx-auto px-4 pt-8 pb-32">
          {children}
        </main>
        <ClientShell />
      </body>
    </html>
  );
}
