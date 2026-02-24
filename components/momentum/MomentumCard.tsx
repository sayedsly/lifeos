"use client";
import type { MomentumSnapshot } from "@/types";
import { getWeakestLink } from "@/lib/momentum/engine";

interface Props {
  snapshot: MomentumSnapshot | null;
  delta: number;
}

const labels: Record<string, string> = {
  nutrition: "Nutrition",
  workout: "Workout",
  sleep: "Sleep",
  tasks: "Tasks",
  finance: "Finance",
  steps: "Steps",
};

const maxPossible: Record<string, number> = {
  nutrition: 30, workout: 20, sleep: 15,
  tasks: 15, finance: 10, steps: 10,
};

export default function MomentumCard({ snapshot, delta }: Props) {
  if (!snapshot) return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 h-52 animate-pulse" />
  );

  const weakest = getWeakestLink(snapshot.breakdown);

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#71717a", textTransform: "uppercase", marginBottom: "8px" }}>
            Momentum Score
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <p style={{ fontSize: "80px", fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-2px" }}>
              {snapshot.score}
            </p>
            <p style={{ fontSize: "28px", color: "#3f3f46", fontWeight: 300, marginBottom: "6px" }}>
              /100
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right", marginTop: "4px" }}>
          <p style={{
            fontSize: "22px",
            fontWeight: 700,
            color: delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : "#52525b"
          }}>
            {delta > 0 ? "+" : ""}{delta}
          </p>
          <p style={{ fontSize: "9px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "2px" }}>
            vs yesterday
          </p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.entries(snapshot.breakdown).map(([key, val]) => {
          const max = maxPossible[key];
          const pct = Math.round((val / max) * 100);
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", color: "#52525b", textTransform: "uppercase", width: "64px", flexShrink: 0 }}>
                {labels[key]}
              </p>
              <div style={{ flex: 1, height: "3px", background: "#27272a", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "white",
                  borderRadius: "999px",
                  transition: "width 700ms ease-out"
                }} />
              </div>
              <p style={{ fontSize: "10px", color: "#52525b", width: "32px", textAlign: "right" }}>
                {val}/{max}
              </p>
            </div>
          );
        })}
      </div>

      {/* Weakest link */}
      {weakest && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px", borderTop: "1px solid #27272a" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", flexShrink: 0 }} />
          <p style={{ fontSize: "9px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Focus today: <span style={{ color: "#a1a1aa", fontWeight: 600 }}>{labels[weakest]}</span>
          </p>
        </div>
      )}
    </div>
  );
}
