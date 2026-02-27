"use client";
import { useState, useEffect } from "react";
import { getWorkoutPlans, saveWorkoutPlan, deleteWorkoutPlan } from "@/lib/supabase/queries";
import { WORKOUT_TYPES, COMMON_EXERCISES } from "@/lib/constants/workouts";

interface PlanExercise { name: string; sets: number; reps: number; weight: number; }
interface Plan { id: string; name: string; type: string; exercises: PlanExercise[]; }

interface Props {
  onStartPlan: (plan: Plan) => void;
}

export default function WorkoutPlans({ onStartPlan }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Push");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await getWorkoutPlans();
    setPlans(data.map((p: any) => ({ id: p.id, name: p.name, type: p.type, exercises: p.exercises || [] })));
  };

  useEffect(() => { load(); }, []);

  const addExercise = (exName: string) => {
    if (exercises.find(e => e.name === exName)) return;
    setExercises(prev => [...prev, { name: exName, sets: 3, reps: 8, weight: 0 }]);
  };

  const updateExercise = (i: number, patch: Partial<PlanExercise>) => {
    setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  };

  const savePlan = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);
    await saveWorkoutPlan({ id: Math.random().toString(36).slice(2), name: name.trim(), type, exercises });
    setName(""); setType("Push"); setExercises([]); setCreating(false);
    await load();
    setSaving(false);
  };

  const suggestions = COMMON_EXERCISES[type] || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>My Plans</p>
        <button onClick={() => setCreating(!creating)}
          style={{ padding: "8px 16px", borderRadius: "10px", background: creating ? "#27272a" : "white", border: "none", color: creating ? "#71717a" : "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
          {creating ? "Cancel" : "+ New Plan"}
        </button>
      </div>

      {/* Create plan form */}
      {creating && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <input placeholder="Plan name (e.g. My Pull Day)" value={name} onChange={e => setName(e.target.value)}
            style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }} />

          {/* Type selector */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            {(WORKOUT_TYPES as readonly string[]).slice(0, 8).map(t => (
              <button key={t} onClick={() => setType(t)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: type === t ? "white" : "#27272a", color: type === t ? "black" : "#52525b" }}>
                {t}
              </button>
            ))}
          </div>

          {/* Suggested exercises */}
          {suggestions.length > 0 && (
            <div>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Quick Add</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => addExercise(s)}
                    style={{ padding: "6px 10px", borderRadius: "8px", background: exercises.find(e => e.name === s) ? "#27272a" : "#18181b", border: "1px solid #27272a", color: exercises.find(e => e.name === s) ? "#52525b" : "#a1a1aa", fontSize: "11px", cursor: "pointer" }}>
                    {exercises.find(e => e.name === s) ? "✓ " : ""}{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercise list with sets/reps/weight */}
          {exercises.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Exercises</p>
              {exercises.map((ex, i) => (
                <div key={ex.name} style={{ background: "#27272a", borderRadius: "14px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <p style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{ex.name}</p>
                    <button onClick={() => setExercises(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: "none", border: "none", color: "#52525b", fontSize: "16px", cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "Sets", key: "sets" as const },
                      { label: "Reps", key: "reps" as const },
                      { label: "Weight (lbs)", key: "weight" as const },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <p style={{ fontSize: "8px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</p>
                        <input type="number" value={ex[key]} onChange={e => updateExercise(i, { [key]: parseFloat(e.target.value) || 0 })}
                          style={{ width: "100%", background: "#18181b", border: "none", borderRadius: "8px", padding: "8px", color: "white", fontSize: "14px", fontWeight: 600, textAlign: "center" as const, outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={savePlan} disabled={saving || !name.trim() || exercises.length === 0}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: name.trim() && exercises.length > 0 ? "white" : "#27272a", border: "none", color: name.trim() && exercises.length > 0 ? "black" : "#52525b", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      )}

      {/* Plans list */}
      {plans.length === 0 && !creating ? (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "32px 20px", textAlign: "center" }}>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No plans yet</p>
          <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Create a plan to pre-load exercises and track progression</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <p style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>{plan.name}</p>
                  <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>{plan.type} · {plan.exercises.length} exercises</p>
                </div>
                <button onClick={() => deleteWorkoutPlan(plan.id).then(load)}
                  style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "18px", cursor: "pointer", padding: "2px 6px" }}>×</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "12px" }}>
                {plan.exercises.map(ex => (
                  <span key={ex.name} style={{ padding: "4px 10px", borderRadius: "8px", background: "#27272a", color: "#a1a1aa", fontSize: "11px" }}>
                    {ex.name} {ex.weight > 0 ? `${ex.weight}lbs` : ""}
                  </span>
                ))}
              </div>
              <button onClick={() => onStartPlan(plan)}
                style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                Start This Plan →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
