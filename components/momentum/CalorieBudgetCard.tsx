"use client";
interface Props { consumed: number; goal: number; }
export default function CalorieBudgetCard({ consumed, goal }: Props) {
  const remaining = goal - consumed;
  const pct = Math.min(consumed / goal, 1);
  const over = consumed > goal;
  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>🍽️ Calories</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: over ? "#ef4444" : "#111118", letterSpacing: "-2px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {Math.abs(remaining).toLocaleString()}
            </span>
            <span style={{ fontSize: "15px", color: "#9ca3af", fontWeight: 600 }}>{over ? "over" : "left"}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{consumed.toLocaleString()} eaten</p>
          <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, marginTop: "2px" }}>of {goal.toLocaleString()} goal</p>
        </div>
      </div>
      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: over ? "linear-gradient(90deg,#fca5a5,#ef4444)" : pct > 0.85 ? "linear-gradient(90deg,#fde68a,#f59e0b)" : "linear-gradient(90deg,#86efac,#22c55e)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
    </div>
  );
}