"use client";
import { useEffect, useState } from "react";
import { getLast7DaysMomentum, getSettings } from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

export default function RecapPage() {
  const [data, setData] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [trend, s] = await Promise.all([getLast7DaysMomentum(), getSettings()]);
      setData(trend);
      setSettings(s);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#52525b" }}>Loading...</div>;

  const avg = data.length > 0 ? Math.round(data.reduce((a, d) => a + d.score, 0) / data.length) : 0;
  const best = data.length > 0 ? Math.max(...data.map(d => d.score)) : 0;
  const domains = ["nutrition", "workout", "sleep", "tasks", "finance", "steps"];
  const domainEmojis: Record<string, string> = { nutrition: "🥗", workout: "💪", sleep: "😴", tasks: "✅", finance: "💰", steps: "👟" };

  const domainAvgs = domains.map(d => ({
    name: d,
    emoji: domainEmojis[d],
    avg: data.length > 0 ? Math.round(data.reduce((a, day) => a + (day.breakdown?.[d] || 0), 0) / data.length) : 0,
    max: settings?.momentumWeights?.[d] || 20,
  }));

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const entry = data.find(d => d.date === date);
    return { date, score: entry?.score || 0, label: format(subDays(new Date(), 6 - i), "EEE") };
  });

  const maxScore = Math.max(...days.map(d => d.score), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
      <div>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Weekly Recap</p>
        <p style={{ fontSize: "22px", fontWeight: 700, color: "white", marginTop: "4px" }}>Last 7 Days</p>
      </div>

      {/* Score summary */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[{ label: "Avg Score", value: avg }, { label: "Best Day", value: best }].map(({ label, value }) => (
            <div key={label} style={{ background: "#27272a", borderRadius: "16px", padding: "16px", textAlign: "center" }}>
              <p style={{ fontSize: "32px", fontWeight: 700, color: "white" }}>{value}</p>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "4px" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* 7-day bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
          {days.map((d, i) => {
            const isToday = i === 6;
            const pct = d.score / maxScore;
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                <p style={{ fontSize: "9px", color: isToday ? "white" : "#52525b", fontWeight: 700 }}>{d.score > 0 ? d.score : ""}</p>
                <div style={{ width: "100%", height: `${Math.max(pct * 100, d.score > 0 ? 6 : 2)}%`, borderRadius: "4px 4px 2px 2px", background: isToday ? "white" : d.score > 0 ? "#3f3f46" : "#27272a" }} />
                <p style={{ fontSize: "9px", color: isToday ? "white" : "#52525b" }}>{d.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain breakdown */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Avg by Category</p>
        {domainAvgs.map(({ name, emoji, avg: a, max }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <p style={{ fontSize: "16px", width: "24px" }}>{emoji}</p>
            <p style={{ flex: 1, fontSize: "12px", color: "white", fontWeight: 600, textTransform: "capitalize" }}>{name}</p>
            <div style={{ flex: 2, height: "3px", background: "#27272a", borderRadius: "999px" }}>
              <div style={{ width: `${(a / max) * 100}%`, height: "100%", background: a / max > 0.7 ? "#34d399" : a / max > 0.4 ? "#f59e0b" : "#ef4444", borderRadius: "999px" }} />
            </div>
            <p style={{ fontSize: "11px", color: "#52525b", width: "40px", textAlign: "right" }}>{a}/{max}</p>
          </div>
        ))}
      </div>

      {/* Streaks / insights */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Insights</p>
        {domainAvgs.sort((a, b) => (b.avg / b.max) - (a.avg / a.max)).slice(0, 1).map(d => (
          <p key={d.name} style={{ color: "#34d399", fontSize: "13px" }}>💪 Best at <strong>{d.name}</strong> this week ({Math.round((d.avg / d.max) * 100)}%)</p>
        ))}
        {domainAvgs.sort((a, b) => (a.avg / a.max) - (b.avg / b.max)).slice(0, 1).map(d => (
          <p key={d.name} style={{ color: "#f59e0b", fontSize: "13px" }}>⚠️ Work on <strong>{d.name}</strong> next week ({Math.round((d.avg / d.max) * 100)}%)</p>
        ))}
        {avg >= 70 && <p style={{ color: "#a78bfa", fontSize: "13px" }}>🔥 Strong week! Above 70 avg score.</p>}
        {avg < 40 && <p style={{ color: "#f87171", fontSize: "13px" }}>📈 Tough week — every small log counts.</p>}
      </div>
    </div>
  );
}
