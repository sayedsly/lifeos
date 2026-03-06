"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/supabase/queries";

const ALL_MODULES = [
  { key: "nutrition", label: "Nutrition", href: "/nutrition", emoji: "🥗" },
  { key: "tasks", label: "Tasks", href: "/tasks", emoji: "✅" },
  { key: "friends", label: "Friends", href: "/friends", emoji: "👥" },
  { key: "workout", label: "Workout", href: "/workout", emoji: "💪" },
  { key: "finance", label: "Finance", href: "/finance", emoji: "💰" },
  { key: "recap", label: "Recap", href: "/recap", emoji: "📊" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [navConfig, setNavConfig] = useState(["nutrition", "workout", "recap"]);

  useEffect(() => {
    getSettings().then(s => {
      if (s.navConfig && s.navConfig.length > 0) setNavConfig(s.navConfig.slice(0, 3));
    }).catch(() => {});
  }, []);

  const middleTabs = navConfig
    .map(key => ALL_MODULES.find(m => m.key === key))
    .filter(Boolean) as typeof ALL_MODULES;

  const leftTabs = [{ label: "Home", href: "/", emoji: "🏠" }, ...middleTabs.slice(0, 2)];
  const rightTabs = [...middleTabs.slice(2), { label: "More", href: "/settings", emoji: "⚙️" }];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(0,0,0,0.06)",
    }}>
      <div style={{ maxWidth: "448px", margin: "0 auto", display: "flex", alignItems: "flex-end", padding: "8px 8px 24px" }}>
        {leftTabs.map(tab => <NavItem key={tab.href} tab={tab} pathname={pathname} />)}

        {/* FAB */}
        <Link href="/nutrition?add=true" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", textDecoration: "none" }}>
          <div style={{
            width: 52, height: 52,
            background: "#111118",
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, color: "white",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            marginBottom: -4,
            transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }} className="btn-press">+</div>
        </Link>

        {rightTabs.map(tab => <NavItem key={tab.href} tab={tab} pathname={pathname} />)}
      </div>
    </nav>
  );
}

function NavItem({ tab, pathname }: { tab: any; pathname: string }) {
  const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
  return (
    <Link href={tab.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", textDecoration: "none", borderRadius: 14, background: isActive ? "rgba(0,0,0,0.05)" : "none", transition: "background 0.15s" }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isActive ? "#111118" : "#9ca3af" }}>{tab.label}</span>
    </Link>
  );
}
