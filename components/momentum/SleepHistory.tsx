"use client";
import { useEffect, useState } from "react";
import { getSleepForDate, getSettings } from "@/lib/supabase/queries";
import { format, subDays } from "date-fns";

export default function SleepHistory() {
  const [data, setData] = useState<{ date: string; hours: number; quality: number; goal: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const s = await getSettings();
      const goal = s.sleepGoal;
      const days = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const date = format(subDays(new Date(), i), "yyyy-MM-dd");
          const sleep = await getSleepForDate(date);
          return { date, hours: sleep?.duration || 0, quality: sleep?.quality || 0, goal };
        })
      );
      setData(days.reverse());
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const max = Math.max(...data.map(d => d.hours), data[0]?.goal || 8, 9);

  const qualityColor = (q: number) => {
    if (q === 0) return "#27272a";
    if (q <= 2) return "#ef4444";
    if (q <= 3) return "#f59e0b";
    return "#34d399";
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "16px" }}>Sleep — 7 Days</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const pct = Math.min(d.hours / max, 1);
          const goalPct = d.goal / max;
          const hit = d.hours >= d.goal;
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ position: "absolute", bottom: `${goalPct * 100}%`, left: 0, right: 0, borderTop: "1px dashed #3f3f46" }} />
                <div style={{ width: "100%", height: `${Math.max(pct * 100, 4)}%`, borderRadius: "4px 4px 2px 2px", background: d.hours === 0 ? "#27272a" : hit ? qualityColor(d.quality) : isToday ? "white" : "#3f3f46", transition: "height 500ms ease-out" }} />
              </div>
              <p style={{ fontSize: "9px", color: isToday ? "white" : "#52525b", fontWeight: isToday ? 700 : 400 }}>
                {isToday ? "Today" : format(new Date(d.date + "T12:00:00"), "EEE")}
              </p>
            </div>
          );
        })}
      </div>
      {/* Quality legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" as const }}>
        {[{ label: "Great (4-5)", color: "#34d399" }, { label: "OK (3)", color: "#f59e0b" }, { label: "Poor (1-2)", color: "#ef4444" }].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
            <p style={{ fontSize: "10px", color: "#52525b" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
