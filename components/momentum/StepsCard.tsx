"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props { current: number; goal: number; onUpdate: () => void; }

export default function StepsCard({ current, goal, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const pct = Math.min(current / goal, 1);
  const today = format(new Date(), "yyyy-MM-dd");

  const handleSave = async () => {
    setSaving(true);
    const count = parseInt(input) || 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("step_entries").upsert({ id: `steps-${user.id}-${today}`, user_id: user.id, date: today, count }, { onConflict: "user_id,date" });
      await computeMomentum(today);
      onUpdate();
    }
    setSaving(false);
    setEditing(false);
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
        <button className="btn-press" onClick={() => { setInput(String(current)); setEditing(!editing); }}
          style={{ background: editing ? "#111118" : "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 16px", fontSize: "12px", fontWeight: 700, color: editing ? "white" : "#374151", cursor: "pointer" }}>
          {editing ? "Cancel" : "Update"}
        </button>
      </div>

      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #fde68a, #f59e0b)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600 }}>{Math.max(0, goal - current).toLocaleString()} steps to go</p>

      {editing && (
        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <input type="number" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter steps"
            style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "16px", fontWeight: 700, color: "#111118", outline: "none", fontFamily: "inherit" }} />
          <button className="btn-press" onClick={handleSave} disabled={saving}
            style={{ padding: "12px 20px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            {saving ? "..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}