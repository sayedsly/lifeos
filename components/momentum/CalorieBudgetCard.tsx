"use client";

interface Props {
  consumed: number;
  goal: number;
}

export default function CalorieBudgetCard({ consumed, goal }: Props) {
  const remaining = goal - consumed;
  const pct = Math.min(consumed / goal, 1);
  const over = consumed > goal;

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Calories Today</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
            <p style={{ fontSize: "36px", fontWeight: 700, color: over ? "#f87171" : "white", fontVariantNumeric: "tabular-nums" }}>
              {remaining > 0 ? remaining : Math.abs(remaining)}
            </p>
            <p style={{ fontSize: "13px", color: "#52525b" }}>{over ? "over" : "left"}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "#52525b" }}>{consumed} eaten</p>
          <p style={{ fontSize: "11px", color: "#3f3f46" }}>of {goal} goal</p>
        </div>
      </div>
      <div style={{ height: "3px", background: "#27272a", borderRadius: "999px" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: "999px", background: over ? "#ef4444" : pct > 0.85 ? "#f59e0b" : "#34d399", transition: "width 500ms ease-out" }} />
      </div>
    </div>
  );
}
