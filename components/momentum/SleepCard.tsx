"use client";
import type { SleepEntry } from "@/types";

interface Props { sleep: SleepEntry | null; goal: number; onLog: () => void; }

export default function SleepCard({ sleep, goal, onLog }: Props) {
  const pct = sleep ? Math.min(sleep.duration / goal, 1) : 0;
  const qualityLabels = ["", "Poor", "Fair", "Good", "Great", "Perfect"];

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>😴 Sleep</p>
          {sleep ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "36px", fontWeight: 900, color: "#111118", letterSpacing: "-2px", lineHeight: 1 }}>{sleep.duration.toFixed(1)}</span>
              <span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 600 }}>/ {goal}h</span>
              {sleep.quality > 0 && <span style={{ fontSize: "11px", fontWeight: 700, color: "#8b5cf6", background: "#f3e8ff", padding: "2px 8px", borderRadius: "6px", marginLeft: "4px" }}>{qualityLabels[sleep.quality]}</span>}
            </div>
          ) : (
            <p style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Not logged yet</p>
          )}
        </div>
        <button className="btn-press" onClick={onLog}
          style={{ background: "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 16px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
          {sleep ? "Edit" : "+ Log"}
        </button>
      </div>

      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #c4b5fd, #8b5cf6)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      {sleep?.bedtime && sleep?.wakeTime && (
        <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, marginTop: "8px" }}>{sleep.bedtime} → {sleep.wakeTime}</p>
      )}
    </div>
  );
}