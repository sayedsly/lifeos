"use client";
import { useEffect, useState } from "react";
import { getLast7DaysMomentum, getSettings } from "@/lib/supabase/queries";
import type { MomentumSnapshot } from "@/types";
import { format } from "date-fns";

export default function RecapPage() {
  const [data, setData] = useState<MomentumSnapshot[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLast7DaysMomentum(), getSettings()]).then(([d, s]) => {
      setData(d); setSettings(s); setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length) : 0;
  const best = data.reduce((b, d) => d.score > b.score ? d : b, data[0] || { score: 0, date: "" });
  const maxScore = Math.max(...data.map(d => d.score), 1);

  const DOMAINS = ["nutrition","workout","sleep","tasks","finance","steps"];
  const DOMAIN_MAX: Record<string, number> = { nutrition: 30, workout: 20, sleep: 15, tasks: 15, finance: 10, steps: 10 };
  const DOMAIN_EMOJI: Record<string, string> = { nutrition: "🥗", workout: "💪", sleep: "😴", tasks: "✅", finance: "💰", steps: "👟" };
  const DOMAIN_COLOR: Record<string, string> = { nutrition: "#22c55e", workout: "#111118", sleep: "#8b5cf6", tasks: "#6366f1", finance: "#f59e0b", steps: "#f59e0b" };

  const domainAvgs: Record<string, number> = {};
  DOMAINS.forEach(d => {
    const vals = data.map(snap => (snap.breakdown as any)?.[d] ?? 0);
    domainAvgs[d] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  const sorted = [...DOMAINS].sort((a, b) => (domainAvgs[b] / DOMAIN_MAX[b]) - (domainAvgs[a] / DOMAIN_MAX[a]));
  const bestDomain = sorted[0];
  const worstDomain = sorted[sorted.length - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      <div style={{ padding: "0 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>This Week</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Recap</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ background: "#111118", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px" }}>Avg Score</p>
          <p style={{ fontSize: "42px", fontWeight: 900, color: "white", letterSpacing: "-2px", lineHeight: 1 }}>{avg}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 16px rgba(245,158,11,0.15)" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.7, marginBottom: "6px" }}>Best Day</p>
          <p style={{ fontSize: "42px", fontWeight: 900, color: "#92400e", letterSpacing: "-2px", lineHeight: 1 }}>{best?.score ?? 0}</p>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#b45309", marginTop: "2px" }}>{best?.date ? format(new Date(best.date + "T00:00:00"), "EEE, MMM d") : "—"}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>7-Day Scores</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
          {data.map((d, i) => {
            const h = (d.score / maxScore) * 100;
            const isToday = d.date === format(new Date(), "yyyy-MM-dd");
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                <p style={{ fontSize: "9px", fontWeight: 700, color: isToday ? "#111118" : "#9ca3af" }}>{d.score}</p>
                <div style={{ width: "100%", height: `${Math.max(h, 6)}%`, background: isToday ? "#111118" : "#e5e7eb", borderRadius: "4px 4px 2px 2px", transition: "height 0.5s ease" }} />
                <p style={{ fontSize: "8px", fontWeight: 600, color: isToday ? "#111118" : "#9ca3af" }}>{format(new Date(d.date + "T00:00:00"), "EEE")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain breakdown */}
      <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>Domain Averages</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DOMAINS.map(d => {
            const pct = domainAvgs[d] / DOMAIN_MAX[d];
            return (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "14px", width: "22px", textAlign: "center" }}>{DOMAIN_EMOJI[d]}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151", width: "70px", textTransform: "capitalize" }}>{d}</span>
                <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: DOMAIN_COLOR[d], borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", width: "40px", textAlign: "right" }}>{Math.round(pct * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>💪</span>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#14532d" }}>Best at {bestDomain} this week ({Math.round((domainAvgs[bestDomain] / DOMAIN_MAX[bestDomain]) * 100)}%)</p>
        </div>
        <div style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#78350f" }}>Work on {worstDomain} next week ({Math.round((domainAvgs[worstDomain] / DOMAIN_MAX[worstDomain]) * 100)}%)</p>
        </div>
        {avg >= 70 ? (
          <div style={{ background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔥</span>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#3730a3" }}>Strong week! Avg above 70</p>
          </div>
        ) : (
          <div style={{ background: "linear-gradient(135deg,#fce7f3,#fbcfe8)", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📈</span>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#831843" }}>Tough week — every small log counts</p>
          </div>
        )}
      </div>
    </div>
  );
}