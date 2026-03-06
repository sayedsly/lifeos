"use client";
import { useState } from "react";
interface Props { score: number; breakdown: Record<string, number>; name: string; }
export default function ShareCard({ score, breakdown, name }: Props) {
  const [shared, setShared] = useState(false);
  const handleShare = async () => {
    const text = `My LifeOS Momentum Score today: ${score}/100 💪\n${Object.entries(breakdown).map(([k, v]) => `${k}: ${v}`).join(" · ")}\nlifeos-iota-wine.vercel.app`;
    if (navigator.share) {
      await navigator.share({ title: "LifeOS Score", text });
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };
  return (
    <button className="btn-press" onClick={handleShare}
      style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", border: "2px solid #e5e7eb", color: shared ? "#22c55e" : "#6b7280", fontWeight: 700, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "inherit" }}>
      {shared ? "✓ Copied!" : "📤 Share Today's Score"}
    </button>
  );
}