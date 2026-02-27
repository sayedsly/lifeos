"use client";
import { useState } from "react";
import { upsertTask } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props {
  onAdd: () => void;
}

export default function AddTaskBar({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);

  const submit = async () => {
    if (!title.trim()) return;
    const today = format(new Date(), "yyyy-MM-dd");
    await upsertTask({
      id: Math.random().toString(36).slice(2),
      date: today,
      title: title.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    });
    await computeMomentum(today);
    setTitle("");
    onAdd();
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Add Task</p>
      <input
        placeholder="What needs to get done?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "14px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <p style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>Priority</p>
        {([1, 2, 3] as const).map(p => (
          <button key={p} onClick={() => setPriority(p)}
            style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", background: priority === p ? "white" : "#27272a", color: priority === p ? "black" : "#52525b" }}>
            {p === 1 ? "High" : p === 2 ? "Mid" : "Low"}
          </button>
        ))}
        <button onClick={submit}
          style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: "10px", background: title.trim() ? "white" : "#27272a", border: "none", color: title.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
          Add
        </button>
      </div>
    </div>
  );
}
