"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Nudge { type: string; message: string; emoji: string; action?: string; }

export default function ProactiveNudges() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/nudges?userId=${session.user.id}&accessToken=${session.access_token}`);
      const data = await res.json();
      setNudges(data.nudges || []);
    };
    load();
  }, []);

  const visible = nudges.filter(n => !dismissed.includes(n.type));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
      {visible.map(n => (
        <div key={n.type} onClick={() => n.action && router.push(n.action)}
          style={{ display: "flex", alignItems: "center", gap: "12px", background: "white", borderRadius: "16px", padding: "12px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: n.action ? "pointer" : "default", border: "1.5px solid #f1f5f9" }}>
          <span style={{ fontSize: "22px" }}>{n.emoji}</span>
          <p style={{ flex: 1, fontSize: "12px", fontWeight: 700, color: "#374151" }}>{n.message}</p>
          <button onClick={e => { e.stopPropagation(); setDismissed(d => [...d, n.type]); }}
            style={{ background: "none", border: "none", color: "#d1d5db", fontSize: "16px", cursor: "pointer", padding: "2px 6px", borderRadius: "6px" }}>✕</button>
        </div>
      ))}
    </div>
  );
}