"use client";
import { useState } from "react";
import type { WorkoutExercise, WorkoutSet } from "@/types";
import RestTimer from "./RestTimer";

interface Props {
  exercise: WorkoutExercise;
  lastExercise?: any;
  onChange: (updated: WorkoutExercise) => void;
  onDelete: () => void;
}

export default function ExerciseBlock({ exercise, lastExercise, onChange, onDelete }: Props) {
  const [resting, setResting] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  const addSet = () => {
    const prev = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: Math.random().toString(36).slice(2),
      exerciseId: exercise.id,
      reps: prev?.reps || 8,
      weight: prev?.weight || 0,
      completed: false,
    };
    onChange({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const removeSet = (index: number) => {
    onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== index) });
  };

  const updateSet = (index: number, field: "weight" | "reps", value: number) => {
    const sets = [...exercise.sets];
    sets[index] = { ...sets[index], [field]: value };
    onChange({ ...exercise, sets });
  };

  const completeSet = (index: number) => {
    const sets = [...exercise.sets];
    if (sets[index].completed) {
      sets[index] = { ...sets[index], completed: false };
      onChange({ ...exercise, sets });
      return;
    }
    sets[index] = { ...sets[index], completed: true };
    onChange({ ...exercise, sets });
    setResting(true);
  };

  const completedCount = exercise.sets.filter(s => s.completed).length;
  const allDone = completedCount === exercise.sets.length && exercise.sets.length > 0;

  return (
    <div style={{
      background: allDone ? "linear-gradient(135deg,#052e16,#14532d)" : "#18181b",
      borderRadius: "20px",
      padding: "18px",
      border: allDone ? "1px solid #166534" : "1px solid #27272a",
      transition: "all 0.3s"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <p style={{ color: "white", fontWeight: 800, fontSize: "15px" }}>{exercise.name}</p>
          {lastExercise && (
            <p style={{ color: "#71717a", fontSize: "10px", fontWeight: 600, marginTop: "2px" }}>
              Last: {lastExercise.sets?.map((s: any) => `${s.weight}×${s.reps}`).join(", ")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: allDone ? "#86efac" : "#52525b" }}>
            {completedCount}/{exercise.sets.length}
          </span>
          <button onClick={onDelete} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: "16px", padding: "2px" }}>×</button>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 16px 1fr 40px 28px", gap: "6px", padding: "0 2px", marginBottom: "6px" }}>
        <span />
        <p style={{ fontSize: "9px", color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>LBS</p>
        <span />
        <p style={{ fontSize: "9px", color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>REPS</p>
        <span />
        <span />
      </div>

      {/* Sets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
        {exercise.sets.map((set, i) => (
          <div key={set.id} style={{
            display: "grid", gridTemplateColumns: "20px 1fr 16px 1fr 40px 28px", gap: "6px", alignItems: "center",
            opacity: set.completed ? 0.45 : 1, transition: "opacity 0.2s"
          }}>
            <p style={{ color: "#52525b", fontSize: "12px", fontWeight: 700, textAlign: "center" }}>{i + 1}</p>
            <input
              type="number" value={set.weight || ""} placeholder="0"
              onChange={e => updateSet(i, "weight", parseFloat(e.target.value) || 0)}
              style={{ background: "#27272a", borderRadius: "10px", padding: "10px 6px", color: "white", fontSize: "14px", fontWeight: 700, textAlign: "center", border: "none", outline: "none", width: "100%", fontFamily: "inherit" }}
            />
            <p style={{ color: "#52525b", fontSize: "12px", textAlign: "center" }}>×</p>
            <input
              type="number" value={set.reps || ""} placeholder="0"
              onChange={e => updateSet(i, "reps", parseInt(e.target.value) || 0)}
              style={{ background: "#27272a", borderRadius: "10px", padding: "10px 6px", color: "white", fontSize: "14px", fontWeight: 700, textAlign: "center", border: "none", outline: "none", width: "100%", fontFamily: "inherit" }}
            />
            <button onClick={() => completeSet(i)} style={{
              height: "36px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "13px",
              background: set.completed ? "#22c55e" : "#27272a", color: set.completed ? "white" : "#52525b", transition: "all 0.15s"
            }}>✓</button>
            <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: "#3f3f46", cursor: "pointer", fontSize: "14px" }}>−</button>
          </div>
        ))}
      </div>

      {/* Rest timer */}
      {resting && (
        <div style={{ marginBottom: "10px" }}>
          <RestTimer seconds={restDuration} onComplete={() => setResting(false)} onSkip={() => setResting(false)}
            onDurationChange={setRestDuration} />
        </div>
      )}

      {/* Add set */}
      <button onClick={addSet} style={{
        width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid #27272a",
        background: "transparent", color: "#52525b", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit"
      }}>+ Add Set</button>
    </div>
  );
}
