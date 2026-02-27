import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Your life, optimized.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeOS",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeOS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ background: "#09090b", color: "white", margin: 0, padding: 0 }}>
        <ClientShell />
        <main style={{ maxWidth: "448px", margin: "0 auto", padding: "0 16px 120px 16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
