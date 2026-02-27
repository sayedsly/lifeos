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
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "16px" }}>Hydration — 7 Days</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const pct = Math.min(d.amount / max, 1);
          const goalPct = d.goal / max;
          const hit = d.amount >= d.goal;
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                {/* Goal line */}
                <div style={{ position: "absolute", bottom: `${goalPct * 100}%`, left: 0, right: 0, borderTop: "1px dashed #3f3f46" }} />
                {/* Bar */}
                <div style={{ width: "100%", height: `${Math.max(pct * 100, 4)}%`, borderRadius: "4px 4px 2px 2px", background: hit ? "#3b82f6" : isToday ? "white" : "#27272a", transition: "height 500ms ease-out" }} />
              </div>
              <p style={{ fontSize: "9px", color: isToday ? "white" : "#52525b", fontWeight: isToday ? 700 : 400 }}>
                {i === data.length - 1 ? "Today" : format(new Date(d.date + "T12:00:00"), "EEE")}
              </p>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#3b82f6" }} />
          <p style={{ fontSize: "10px", color: "#52525b" }}>Goal hit</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "12px", borderTop: "1px dashed #3f3f46" }} />
          <p style={{ fontSize: "10px", color: "#52525b" }}>Daily goal</p>
        </div>
      </div>
    </div>
  );
}
