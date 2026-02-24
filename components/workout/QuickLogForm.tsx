"use client";
import { useState } from "react";
import type { WorkoutSession } from "@/types";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { useLifeStore } from "@/store/useLifeStore";
import WorkoutTypeSelector from "./WorkoutTypeSelector";
import RPESelector from "./RPESelector";
import { format } from "date-fns";

interface Props {
  onSave: () => void;
}

export default function QuickLogForm({ onSave }: Props) {
  const [type, setType] = useState("Push");
  const [duration, setDuration] = useState("60");
  const [intensity, setIntensity] = useState(7);
  const { refreshMomentum } = useLifeStore();

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_sessions").insert({
      id: Math.random().toString(36).slice(2),
      user_id: user.id,
      date: format(new Date(), "yyyy-MM-dd"),
      timestamp: Date.now(),
      type, duration: parseInt(duration),
      intensity, exercises: [], completed: true,
    });
    await computeMomentum(format(new Date(), "yyyy-MM-dd"));
    refreshMomentum();
    onSave();
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <WorkoutTypeSelector selected={type} onSelect={setType} />
      <div>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Duration (minutes)</p>
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "22px", fontWeight: 700, outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <RPESelector value={intensity} onChange={setIntensity} />
      <button
        onClick={save}
        style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
      >
        Log Workout
      </button>
    </div>
  );
}
