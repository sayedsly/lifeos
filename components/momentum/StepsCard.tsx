"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props { current: number; goal: number; onUpdate: () => void; }

const STEP_AMOUNTS = [500, 1000, 2000, 5000];

export default function StepsCard({ current, goal, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const pct = Math.min(current / goal, 1);
  const today = format(new Date(), "yyyy-MM-dd");

  const updateSteps = async (newCount: number) => {
    setSaving(true);
    const count = Math.max(0, newCount);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("step_entries").upsert(
        { id: `steps-${user.id}-${today}`, user_id: user.id, date: today, count },
        { onConflict: "user_id,date" }
      );
      await computeMomentum(today);
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>👟 Steps</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#111118", letterSpacing: "-2px", lineHeight: 1 }}>{current.toLocaleString()}</span>
            <span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 600 }}>/ {goal.toLocaleString()}</span>
          </div>
        </div>
        <button className="btn-press" onClick={() => setAdding(!adding)}
          style={{ background: adding ? "#111118" : "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 16px", fontSize: "12px", fontWeight: 700, color: adding ? "white" : "#374151", cursor: "pointer" }}>
          {adding ? "Done" : "+ Add"}
        </button>
      </div>

      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #fde68a, #f59e0b)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, marginBottom: adding ? "14px" : "0" }}>
        {Math.max(0, goal - current).toLocaleString()} steps to go
      </p>

      {adding && (
        <>
          {/* Quick add buttons */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" as const }}>
            {STEP_AMOUNTS.map(amt => (
              <button key={amt} className="btn-press" onClick={() => updateSteps(current + amt)} disabled={saving}
                style={{ flex: 1, padding: "10px 6px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#78350f", cursor: "pointer", minWidth: "56px" }}>
                +{amt >= 1000 ? `${amt/1000}k` : amt}
              </button>
            ))}
          </div>
          {/* Remove buttons */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            {[500, 1000].map(amt => (
              <button key={amt} className="btn-press" onClick={() => updateSteps(current - amt)} disabled={saving}
                style={{ flex: 1, padding: "10px 6px", background: "#fef2f2", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}>
                −{amt >= 1000 ? `${amt/1000}k` : amt}
              </button>
            ))}
            <button className="btn-press" onClick={() => updateSteps(0)} disabled={saving}
              style={{ padding: "10px 14px", background: "#fef2f2", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}>
              Reset
            </button>
          </div>
          {/* Manual input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Set exact count..."
              style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "11px 14px", fontSize: "15px", fontWeight: 700, color: "#111118", outline: "none", fontFamily: "inherit" }} />
            <button className="btn-press" onClick={() => { if (custom) { updateSteps(parseInt(custom)); setCustom(""); }}} disabled={saving || !custom}
              style={{ padding: "11px 18px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "..." : "Set"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}