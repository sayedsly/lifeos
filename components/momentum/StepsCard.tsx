"use client";
import { useState } from "react";
import { upsertSteps } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props {
  current: number;
  goal: number;
  onUpdate?: () => void;
}

export default function StepsCard({ current, goal, onUpdate }: Props) {
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const pct = Math.min(Math.round((current / goal) * 100), 100);
  const goalHit = current >= goal;
  const today = format(new Date(), "yyyy-MM-dd");

  const save = async () => {
    const count = parseInt(input);
    if (!count || count < 0) { setEditing(false); setInput(""); return; }
    setLoading(true);
    await upsertSteps({ id: `steps-${today}`, date: today, count });
    await computeMomentum(today);
    setLoading(false);
    setEditing(false);
    setInput("");
    onUpdate?.();
  };

  const quickAdd = async (amount: number) => {
    setLoading(true);
    await upsertSteps({ id: `steps-${today}`, date: today, count: current + amount });
    await computeMomentum(today);
    setLoading(false);
    onUpdate?.();
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Steps</p>
          {editing ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                autoFocus
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setInput(""); } }}
                placeholder={String(current)}
                style={{ width: "120px", background: "#27272a", border: "none", borderRadius: "12px", padding: "8px 12px", color: "white", fontSize: "28px", fontWeight: 700, outline: "none" }}
              />
              <button onClick={save} disabled={loading} style={{ padding: "8px 16px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                {loading ? "..." : "Set"}
              </button>
              <button onClick={() => { setEditing(false); setInput(""); }} style={{ padding: "8px 12px", borderRadius: "10px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <p style={{ fontSize: "40px", fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {current.toLocaleString()}
              </p>
            </button>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Goal</p>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#52525b" }}>{goal.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "3px", background: "#27272a", borderRadius: "999px", marginBottom: "12px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: goalHit ? "#34d399" : "white", borderRadius: "999px", transition: "width 500ms ease-out" }} />
      </div>

      {/* Status + quick add */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "10px", color: goalHit ? "#34d399" : "#52525b", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {goalHit ? "Goal hit 🎉" : `${(goal - current).toLocaleString()} to go`}
        </p>
        {!editing && (
          <div style={{ display: "flex", gap: "6px" }}>
            {[1000, 2500, 5000].map(n => (
              <button key={n} onClick={() => quickAdd(n)} disabled={loading} data-amount={n}
                style={{ padding: "6px 10px", borderRadius: "8px", background: "#27272a", border: "none", color: "#a1a1aa", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>
                +{(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
