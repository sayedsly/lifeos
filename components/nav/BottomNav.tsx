"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/" },
  { label: "Nutr", href: "/nutrition" },
  { label: "Tasks", href: "/tasks" },
  { label: "Friends", href: "/friends" },
  { label: "More", href: "/settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#09090b", borderTop: "1px solid #18181b" }}>
      <div style={{ maxWidth: "448px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", paddingBottom: "20px", paddingTop: "8px" }}>
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "4px", textDecoration: "none" }}>
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: isActive ? "white" : "transparent" }} />
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: isActive ? "white" : "#52525b" }}>
                {tab.label}
              </p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
