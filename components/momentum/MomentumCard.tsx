"use client";
import type { MomentumSnapshot } from "@/types";

interface Props { momentum: MomentumSnapshot | null; delta: number; }

const DOMAINS = [
  { key: "nutrition", emoji: "🥗", label: "Nutrition", color: "#4ade80" },
  { key: "workout", emoji: "💪", label: "Workout", color: "#ffffff" },
  { key: "sleep", emoji: "😴", label: "Sleep", color: "#fbbf24" },
  { key: "tasks", emoji: "✅", label: "Tasks", color: "#a78bfa" },
  { key: "steps", emoji: "👟", label: "Steps", color: "#fbbf24" },
  { key: "finance", emoji: "💰", label: "Finance", color: "#34d399" },
];

export default function MomentumCard({ momentum, delta }: Props) {
  const score = momentum?.score ?? 0;
  const breakdown = momentum?.breakdown ?? {} as any;

  return (
    <div style={{
      background: "#111118",
      borderRadius: "28px",
      padding: "22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 8px 28px rgba(17,17,24,0.2)",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginBottom: "20px" }}>
        <div style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-4px", lineHeight: 1 }}>{score}</div>
        <div style={{ paddingBottom: "8px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Momentum</p>
          {delta !== 0 && (
            <div style={{ marginTop: "4px", display: "inline-block", fontSize: "12px", fontWeight: 700, color: delta > 0 ? "#4ade80" : "#f87171", background: delta > 0 ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", padding: "2px 8px", borderRadius: "6px" }}>
              {delta > 0 ? "+" : ""}{delta} from yesterday
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {DOMAINS.map(({ key, emoji, label, color }) => {
          const val = (breakdown as any)[key] ?? 0;
          const max = key === "nutrition" ? 30 : key === "workout" ? 20 : key === "sleep" ? 15 : key === "tasks" ? 15 : key === "steps" ? 10 : 10;
          const pct = Math.min(val / max, 1);
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", width: "20px", textAlign: "center" }}>{emoji}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.45)", width: "64px" }}>{label}</span>
              <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)" }} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.2)", width: "36px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{val}/{max}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}