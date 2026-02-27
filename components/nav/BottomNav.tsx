"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/supabase/queries";

const ALL_MODULES = [
  { key: "nutrition", label: "Nutr", href: "/nutrition" },
  { key: "tasks", label: "Tasks", href: "/tasks" },
  { key: "friends", label: "Friends", href: "/friends" },
  { key: "workout", label: "Work", href: "/workout" },
  { key: "finance", label: "Finance", href: "/finance" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [navConfig, setNavConfig] = useState(["nutrition", "tasks", "friends"]);

  useEffect(() => {
    getSettings().then(s => {
      if (s.navConfig && s.navConfig.length > 0) setNavConfig(s.navConfig.slice(0, 3));
    }).catch(() => {});
  }, []);

  const middleTabs = navConfig
    .map(key => ALL_MODULES.find(m => m.key === key))
    .filter(Boolean) as typeof ALL_MODULES;

  const tabs = [
    { label: "Home", href: "/" },
    ...middleTabs,
    { label: "More", href: "/settings" },
  ];

  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#09090b", borderTop: "1px solid #18181b" }}>
      <div style={{ maxWidth: "448px", margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, paddingBottom: "20px", paddingTop: "8px" }}>
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
