"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Props {
  onAdd: () => void;
}

export default function AddGoalForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const submit = async () => {
    if (!name.trim() || !target) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_goals").insert({
      id: Math.random().toString(36).slice(2),
      user_id: user.id,
      name: name.trim(),
      target: parseFloat(target),
      current: 0,
      currency: "$",
      created_at: Date.now(),
    });
    setName(""); setTarget(""); setOpen(false);
    onAdd();
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
      >
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>New Goal</p>
        <span style={{ color: "#52525b", fontSize: "18px" }}>{open ? "×" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #27272a", display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            placeholder="Goal name (e.g. Japan Trip)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ marginTop: "12px", width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
          <input
            placeholder="Target amount ($)"
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
          <button
            onClick={submit}
            style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
          >
            Create Goal
          </button>
        </div>
      )}
    </div>
  );
}
