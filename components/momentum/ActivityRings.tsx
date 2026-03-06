"use client";
import { useState } from "react";
import type { MomentumBreakdown } from "@/types";
import { updateSettings, getSettings } from "@/lib/supabase/queries";

const DOMAIN_META: Record<string, { label: string; emoji: string; color: string; maxScore: number }> = {
  nutrition: { label: "Nutrition", emoji: "🥗", color: "#22c55e", maxScore: 30 },
  workout:   { label: "Workout",   emoji: "💪", color: "#6366f1", maxScore: 20 },
  sleep:     { label: "Sleep",     emoji: "😴", color: "#8b5cf6", maxScore: 15 },
  tasks:     { label: "Tasks",     emoji: "✅", color: "#f59e0b", maxScore: 15 },
  finance:   { label: "Finance",   emoji: "💰", color: "#3b82f6", maxScore: 10 },
  steps:     { label: "Steps",     emoji: "👟", color: "#f97316", maxScore: 10 },
};

const ALL_DOMAINS = Object.keys(DOMAIN_META);

interface Props {
  breakdown: MomentumBreakdown;
  score: number;
  ringsConfig: [string, string, string];
  onConfigChange: (config: [string, string, string]) => void;
}

function Ring({ pct, color, size, stroke, children }: { pct: number; color: string; size: number; stroke: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct, 1) * circ;
  const over = pct > 1;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "22"} strokeWidth={stroke} />
      {/* Progress */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      {/* Overachieve sparkle dot */}
      {over && (
        <circle cx={size/2} cy={stroke/2} r={stroke/2 + 1} fill={color} />
      )}
    </svg>
  );
}

export default function ActivityRings({ breakdown, score, ringsConfig, onConfigChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<[string,string,string]>(ringsConfig);

  const sizes = [140, 108, 76];
  const strokes = [14, 13, 12];

  const handleSave = async () => {
    onConfigChange(draft);
    setEditing(false);
    const s = await getSettings();
    await updateSettings({ ...s, ringsConfig: draft });
  };

  return (
    <div style={{ background: "white", borderRadius: "28px", padding: "24px 20px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
      {/* Rings + score */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
        {/* Stacked rings */}
        <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
          {ringsConfig.map((domain, i) => {
            const meta = DOMAIN_META[domain];
            if (!meta) return null;
            const raw = (breakdown as any)[domain] || 0;
            const pct = raw / meta.maxScore;
            const offset = (140 - sizes[i]) / 2;
            return (
              <div key={domain} style={{ position: "absolute", top: offset, left: offset }}>
                <Ring pct={pct} color={meta.color} size={sizes[i]} stroke={strokes[i]} />
              </div>
            );
          })}
          {/* Center score */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "#111118", lineHeight: 1, letterSpacing: "-1px" }}>{score}</p>
            <p style={{ fontSize: "9px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>score</p>
          </div>
        </div>

        {/* Ring legend */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          {ringsConfig.map((domain, i) => {
            const meta = DOMAIN_META[domain];
            if (!meta) return null;
            const raw = (breakdown as any)[domain] || 0;
            const pct = Math.min(raw / meta.maxScore, 1);
            return (
              <div key={domain}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>{meta.emoji} {meta.label}</p>
                  </div>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: meta.color }}>{Math.round(pct * 100)}%</p>
                </div>
                <div style={{ height: "4px", background: meta.color + "22", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: meta.color, borderRadius: "999px", transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
              </div>
            );
          })}
          <button onClick={() => { setDraft(ringsConfig); setEditing(true); }}
            style={{ marginTop: "2px", padding: "6px 10px", background: "#f7f8fc", border: "none", borderRadius: "8px", fontSize: "10px", fontWeight: 700, color: "#9ca3af", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
            ⚙️ Customize
          </button>
        </div>
      </div>

      {/* Customize modal */}
      {editing && (
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "11px", fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Customize Rings</p>
          {([0,1,2] as const).map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: DOMAIN_META[draft[i]]?.color || "#e5e7eb", flexShrink: 0 }} />
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", width: 50 }}>Ring {i+1}</p>
              <div style={{ display: "flex", gap: "4px", flex: 1, flexWrap: "wrap" as const }}>
                {ALL_DOMAINS.map(d => {
                  const meta = DOMAIN_META[d];
                  const active = draft[i] === d;
                  return (
                    <button key={d} onClick={() => { const nd = [...draft] as [string,string,string]; nd[i] = d; setDraft(nd); }}
                      style={{ padding: "5px 9px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 700,
                        background: active ? meta.color : "#f7f8fc",
                        color: active ? "white" : "#9ca3af" }}>
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleSave}
              style={{ flex: 1, padding: "11px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Save
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: "11px 16px", background: "#f1f5f9", border: "none", borderRadius: "12px", color: "#6b7280", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}