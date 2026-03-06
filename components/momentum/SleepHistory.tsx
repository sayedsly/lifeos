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
    if (q === 0) return "#e5e7eb";
    if (q <= 2) return "#fca5a5";
    if (q <= 3) return "#fde68a";
    return "#86efac";
  };

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>😴 Sleep — 7 Days</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const pct = Math.min(d.hours / max, 1);
          const goalPct = d.goal / max;
          const hit = d.hours >= d.goal;
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ position: "absolute", bottom: `${goalPct * 100}%`, left: 0, right: 0, borderTop: "1.5px dashed #d1d5db" }} />
                <div style={{ width: "100%", height: `${Math.max(pct * 100, 4)}%`, borderRadius: "4px 4px 2px 2px", background: d.hours === 0 ? "#f1f5f9" : hit ? qualityColor(d.quality) : isToday ? "#111118" : "#e5e7eb", transition: "height 500ms ease-out" }} />
              </div>
              <p style={{ fontSize: "9px", color: isToday ? "#111118" : "#9ca3af", fontWeight: isToday ? 700 : 600 }}>
                {isToday ? "Today" : format(new Date(d.date + "T12:00:00"), "EEE")}
              </p>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
        {[{ label: "Great", color: "#86efac" }, { label: "OK", color: "#fde68a" }, { label: "Poor", color: "#fca5a5" }].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}