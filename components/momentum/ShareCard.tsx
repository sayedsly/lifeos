"use client";
import { useState } from "react";

interface Props {
  score: number;
  breakdown: Record<string, number>;
  name: string;
}

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
    <button onClick={handleShare}
      style={{ width: "100%", padding: "14px", borderRadius: "16px", background: "#18181b", border: "1px solid #27272a", color: shared ? "#34d399" : "#71717a", fontWeight: 600, fontSize: "13px", cursor: "pointer", letterSpacing: "0.05em" }}>
      {shared ? "✓ Copied to clipboard!" : "📤 Share Score"}
    </button>
  );
}
