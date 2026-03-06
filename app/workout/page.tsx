"use client";
import { useEffect, useState } from "react";
import WorkoutPlans from "@/components/workout/WorkoutPlans";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import StructuredSession from "@/components/workout/StructuredSession";
import { format } from "date-fns";

type View = "plans" | "session" | "history";

export default function WorkoutPage() {
  const [view, setView] = useState<View>("plans");
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      {/* Header */}
      <div style={{ padding: "0 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Workout</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["plans", "session", "history"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: "9px", borderRadius: "12px", border: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, cursor: "pointer", background: view === v ? "#111118" : "transparent", color: view === v ? "white" : "#9ca3af", transition: "all 0.15s" }}>
            {v === "plans" ? "💪 Plans" : v === "session" ? "▶ Session" : "📊 History"}
          </button>
        ))}
      </div>

      {view === "plans" && (
        <WorkoutPlans onStartPlan={(plan) => { setActiveWorkoutId(plan.id); setView("session"); }} />
      )}
      {view === "session" && (
        <StructuredSession type="plan" onSave={() => setView("history")} onCancel={() => setView("plans")} />
      )}
      {view === "history" && <WorkoutHistory />}
    </div>
  );
}