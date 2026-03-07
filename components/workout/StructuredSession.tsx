"use client";
import { useState, useEffect, useRef } from "react";
import type { WorkoutSession, WorkoutExercise } from "@/types";
import { COMMON_EXERCISES } from "@/lib/constants/workouts";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { useLifeStore } from "@/store/useLifeStore";
import ExerciseBlock from "./ExerciseBlock";
import { format } from "date-fns";

interface Props {
  type: string;
  planExercises?: any[];
  lastSession?: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function StructuredSession({ type, planExercises, lastSession, onSave, onCancel }: Props) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [intensity, setIntensity] = useState(7);
  const [elapsed, setElapsed] = useState(0);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { refreshMomentum } = useLifeStore();
  const allSuggestions = COMMON_EXERCISES[type] || [];
  const filtered = search.trim()
    ? allSuggestions.filter((e: string) => e.toLowerCase().includes(search.toLowerCase()))
    : allSuggestions;

  useEffect(() => {
    if (planExercises && planExercises.length > 0) {
      setExercises(planExercises.map((e: any) => ({
        id: Math.random().toString(36).slice(2),
        name: e.name,
        sets: Array.from({ length: e.sets || 3 }, () => ({
          id: Math.random().toString(36).slice(2),
          exerciseId: e.name,
          reps: e.reps || 8,
          weight: e.weight || 0,
          completed: false,
        })),
      })));
    }
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      sets: [{ id: Math.random().toString(36).slice(2), exerciseId: Math.random().toString(36).slice(2), reps: 8, weight: 0, completed: false }],
    }]);
    setSearch("");
    setShowSearch(false);
  };

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = exercises.reduce((s, e) => s + e.sets.filter(s => s.completed).length, 0);
  const totalVolume = exercises.reduce((s, e) => s + e.sets.filter(s => s.completed).reduce((ss, set) => ss + ((set.weight || 0) * (set.reps || 0)), 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;
      const today = format(new Date(), "yyyy-MM-dd");
      const workoutSession: WorkoutSession = {
        id: Math.random().toString(36).slice(2),
        date: today,
        type,
        duration: Math.floor(elapsed / 60),
        intensity,
        exercises,
        completed: true,
        timestamp: Date.now(),
      };
      await supabase.from("workout_sessions").insert({ ...workoutSession, user_id: authSession.user.id });
      const snapshot = await computeMomentum(today);
      await supabase.from("momentum_snapshots").upsert({ id: Math.random().toString(36).slice(2), user_id: authSession.user.id, date: today, score: snapshot.total, breakdown: snapshot.breakdown, timestamp: Date.now() });
      refreshMomentum();
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Stats bar */}
      <div style={{ background: "#18181b", borderRadius: "18px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const }}>
          <p style={{ color: "#a78bfa", fontSize: "18px", fontWeight: 900 }}>{formatTime(elapsed)}</p>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Time</p>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <p style={{ color: "white", fontSize: "18px", fontWeight: 900 }}>{completedSets}<span style={{ color: "#52525b", fontSize: "12px" }}>/{totalSets}</span></p>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Sets</p>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <p style={{ color: "white", fontSize: "18px", fontWeight: 900 }}>{totalVolume > 0 ? `${(totalVolume/1000).toFixed(1)}k` : "0"}</p>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Volume</p>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <p style={{ color: "white", fontSize: "18px", fontWeight: 900 }}>{exercises.length}</p>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Exercises</p>
        </div>
      </div>

      {/* Exercise blocks */}
      {exercises.map((ex, i) => {
        const lastEx = lastSession?.exercises?.find((e: any) => e.name === ex.name);
        return (
          <ExerciseBlock key={ex.id} exercise={ex} lastExercise={lastEx}
            onChange={updated => setExercises(prev => prev.map((e, j) => j === i ? updated : e))}
            onDelete={() => setExercises(prev => prev.filter((_, j) => j !== i))}
          />
        );
      })}

      {/* Add exercise */}
      {showSearch ? (
        <div style={{ background: "#18181b", borderRadius: "18px", padding: "14px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search exercise..."
            autoFocus
            onKeyDown={e => { if (e.key === "Enter" && search.trim()) addExercise(search.trim()); }}
            style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 14px", color: "white", fontSize: "14px", fontWeight: 600, outline: "none", fontFamily: "inherit", marginBottom: "10px", boxSizing: "border-box" as const }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {filtered.slice(0, 12).map((name: string) => (
              <button key={name} onClick={() => addExercise(name)} style={{
                padding: "6px 12px", background: "#27272a", border: "none", borderRadius: "10px",
                color: "#d4d4d8", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
              }}>{name}</button>
            ))}
            {search.trim() && !filtered.includes(search.trim()) && (
              <button onClick={() => addExercise(search.trim())} style={{
                padding: "6px 12px", background: "#7c3aed", border: "none", borderRadius: "10px",
                color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
              }}>+ Add "{search.trim()}"</button>
            )}
          </div>
          <button onClick={() => setShowSearch(false)} style={{ marginTop: "10px", background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowSearch(true)} style={{
          padding: "14px", borderRadius: "16px", border: "1.5px dashed #27272a", background: "transparent",
          color: "#52525b", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
          cursor: "pointer", fontFamily: "inherit"
        }}>+ Add Exercise</button>
      )}

      {/* Intensity */}
      <div style={{ background: "#18181b", borderRadius: "18px", padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <p style={{ color: "#a1a1aa", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Intensity</p>
          <p style={{ color: "white", fontSize: "20px", fontWeight: 900 }}>{intensity}<span style={{ color: "#52525b", fontSize: "12px" }}>/10</span></p>
        </div>
        <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: "#a78bfa" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700 }}>Easy</p>
          <p style={{ color: "#52525b", fontSize: "9px", fontWeight: 700 }}>Max Effort</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", paddingBottom: "20px" }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "#18181b", border: "none", color: "#71717a", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || exercises.length === 0} style={{
          flex: 2, padding: "14px", borderRadius: "14px", border: "none", fontWeight: 800, fontSize: "14px", cursor: "pointer", fontFamily: "inherit",
          background: exercises.length === 0 ? "#27272a" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
          color: exercises.length === 0 ? "#52525b" : "white"
        }}>{saving ? "Saving..." : `Finish Workout${completedSets > 0 ? ` · ${completedSets} sets` : ""}`}</button>
      </div>
    </div>
  );
}