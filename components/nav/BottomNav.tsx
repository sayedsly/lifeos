"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/" },
  { label: "Nutr", href: "/nutrition" },
  { label: "Work", href: "/workout" },
  { label: "Tasks", href: "/tasks" },
  { label: "More", href: "/settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800">
      <div className="max-w-md mx-auto grid grid-cols-5 pb-5 pt-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href) && (tab.href === "/" ? pathname === "/" : true);
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1.5 py-1">
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
