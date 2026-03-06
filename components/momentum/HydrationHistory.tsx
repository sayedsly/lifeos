"use client";
import { useEffect, useState } from "react";
import { getHydrationForDate, getSettings } from "@/lib/supabase/queries";
import { format, subDays } from "date-fns";

export default function HydrationHistory() {
  const [data, setData] = useState<{ date: string; amount: number; goal: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const s = await getSettings();
      const goal = s.hydrationGoal;
      const days = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const date = format(subDays(new Date(), i), "yyyy-MM-dd");
          const amount = await getHydrationForDate(date);
          return { date, amount, goal };
        })
      );
      setData(days.reverse());
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const max = Math.max(...data.map(d => d.amount), data[0]?.goal || 2500);

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>💧 Hydration — 7 Days</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const pct = Math.min(d.amount / max, 1);
          const goalPct = d.goal / max;
          const hit = d.amount >= d.goal;
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ position: "absolute", bottom: `${goalPct * 100}%`, left: 0, right: 0, borderTop: "1.5px dashed #d1d5db" }} />
                <div style={{ width: "100%", height: `${Math.max(pct * 100, 4)}%`, borderRadius: "4px 4px 2px 2px", background: hit ? "linear-gradient(180deg,#6ee7f7,#3b82f6)" : isToday ? "#111118" : "#e5e7eb", transition: "height 500ms ease-out" }} />
              </div>
              <p style={{ fontSize: "9px", color: isToday ? "#111118" : "#9ca3af", fontWeight: isToday ? 700 : 600 }}>
                {i === data.length - 1 ? "Today" : format(new Date(d.date + "T12:00:00"), "EEE")}
              </p>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6" }} />
          <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>Goal hit</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: 12, borderTop: "1.5px dashed #d1d5db" }} />
          <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>Daily goal</p>
        </div>
      </div>
    </div>
  );
}