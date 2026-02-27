"use client";
import { useState, useEffect, useRef } from "react";
import type { WorkoutSession, WorkoutExercise } from "@/types";
import { COMMON_EXERCISES } from "@/lib/constants/workouts";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { useLifeStore } from "@/store/useLifeStore";
import ExerciseBlock from "./ExerciseBlock";
import RPESelector from "./RPESelector";
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
  const [customExercise, setCustomExercise] = useState("");
  const [showOverload, setShowOverload] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { refreshMomentum } = useLifeStore();
  const suggestions = COMMON_EXERCISES[type] || [];

  useEffect(() => {
    // Pre-load plan exercises if available
    if (planExercises && planExercises.length > 0) {
      const loaded: WorkoutExercise[] = planExercises.map((e: any) => ({
        id: Math.random().toString(36).slice(2),
        name: e.name,
        sets: Array.from({ length: e.sets || 3 }, () => ({
          id: Math.random().toString(36).slice(2),
          exerciseId: e.name,
          reps: e.reps || 8,
          weight: e.weight || 0,
          completed: false,
        })),
      }));
      setExercises(loaded);
      if (lastSession) setShowOverload(true);
    }
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    const ex: WorkoutExercise = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      sets: [{ id: Math.random().toString(36).slice(2), exerciseId: Math.random().toString(36).slice(2), reps: 8, weight: 0, completed: false }],
    };
    setExercises(prev => [...prev, ex]);
    setCustomExercise("");
  };

  const finish = async () => {
    clearInterval(timerRef.current!);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_sessions").insert({
      id: Math.random().toString(36).slice(2),
      user_id: user.id,
      date: format(new Date(), "yyyy-MM-dd"),
      timestamp: Date.now(),
      type, duration: Math.round(elapsed / 60),
      intensity, exercises, completed: true,
    });
    await computeMomentum(format(new Date(), "yyyy-MM-dd"));
    refreshMomentum();
    onSave();
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const completedSets = exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
  const totalVolume = exercises.reduce((sum, e) => sum + e.sets.reduce((s2, s) => s2 + (s.completed ? (s.weight || 0) * (s.reps || 0) : 0), 0), 0);

  // Build progressive overload suggestions from last session
  const overloadMap: Record<string, { weight: number; reps: number; suggestion: string }> = {};
  if (lastSession?.exercises) {
    for (const ex of lastSession.exercises) {
      const completedSets = ex.sets?.filter((s: any) => s.completed) || [];
      if (completedSets.length === 0) continue;
      const avgWeight = completedSets.reduce((a: number, s: any) => a + (s.weight || 0), 0) / completedSets.length;
      const avgReps = completedSets.reduce((a: number, s: any) => a + (s.reps || 0), 0) / completedSets.length;
      const suggestWeight = avgReps >= 10 ? Math.round((avgWeight + 5) * 2) / 2 : avgWeight;
      const suggestReps = avgReps < 8 ? Math.round(avgReps + 1) : avgReps;
      overloadMap[ex.name] = {
        weight: Math.round(avgWeight * 10) / 10,
        reps: Math.round(avgReps),
        suggestion: avgReps >= 10
          ? `Last: ${Math.round(avgWeight)}lbs × ${Math.round(avgReps)} → Try ${suggestWeight}lbs`
          : `Last: ${Math.round(avgWeight)}lbs × ${Math.round(avgReps)} → Try ${suggestReps} reps`,
      };
    }
  }

  return (
    <div className="space-y-4">
      {/* Timer + stats */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", textAlign: "center" }}>
          <div>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>{formatTime(elapsed)}</p>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Duration</p>
          </div>
          <div>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>{completedSets}/{totalSets}</p>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Sets</p>
          </div>
          <div>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>{totalVolume.toLocaleString()}</p>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Volume lbs</p>
          </div>
        </div>
      </div>

      {/* Progressive overload banner */}
      {showOverload && Object.keys(overloadMap).length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #3b82f6", borderRadius: "20px", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "#3b82f6", textTransform: "uppercase" }}>⚡ Progressive Overload</p>
            <button onClick={() => setShowOverload(false)} style={{ background: "none", border: "none", color: "#52525b", fontSize: "16px", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(overloadMap).map(([name, data]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{name}</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px" }}>{data.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Add Exercise</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => addExercise(s)}
                style={{ padding: "8px 12px", borderRadius: "10px", background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", fontSize: "12px", cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <input placeholder="Custom exercise..." value={customExercise} onChange={e => setCustomExercise(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addExercise(customExercise)}
          style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none" }} />
        <button onClick={() => addExercise(customExercise)}
          style={{ padding: "12px 16px", borderRadius: "14px", background: "#27272a", color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: "pointer" }}>
          Add
        </button>
      </div>

      {exercises.map((ex, i) => (
        <div key={ex.id}>
          {overloadMap[ex.name] && (
            <p style={{ fontSize: "10px", color: "#3b82f6", marginBottom: "4px", paddingLeft: "4px" }}>
              ⚡ {overloadMap[ex.name].suggestion}
            </p>
          )}
          <ExerciseBlock exercise={ex} onChange={updated => {
            const list = [...exercises]; list[i] = updated; setExercises(list);
          }} />
        </div>
      ))}

      {exercises.length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <RPESelector value={intensity} onChange={setIntensity} />
          <button onClick={finish}
            style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: "pointer" }}>
            Finish Workout
          </button>
        </div>
      )}

      <button onClick={onCancel}
        style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
        Cancel Session
      </button>
    </div>
  );
}
