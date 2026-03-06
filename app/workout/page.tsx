"use client";
import { useState } from "react";
import WorkoutPlans from "@/components/workout/WorkoutPlans";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import StructuredSession from "@/components/workout/StructuredSession";
import { format } from "date-fns";

type View = "plans" | "session" | "history";

interface ActivePlan { id: string; name: string; type: string; exercises: any[]; }

export default function WorkoutPage() {
  const [view, setView] = useState<View>("plans");
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleStartPlan = (plan: ActivePlan) => {
    setActivePlan(plan);
    setSessionStarted(false);
    setView("session");
  };

  const handleComplete = () => {
    setActivePlan(null);
    setSessionStarted(false);
    setView("history");
  };

  const handleCancel = () => {
    setActivePlan(null);
    setSessionStarted(false);
    setView("plans");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      <div style={{ padding: "0 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Workout</p>
      </div>

      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["plans", "session", "history"] as const).map(v => (
          <button key={v} onClick={() => { if (v !== "session") { setActivePlan(null); setSessionStarted(false); } setView(v); }}
            style={{ flex: 1, padding: "9px", borderRadius: "12px", border: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, cursor: "pointer",
              background: view === v ? "#111118" : "transparent", color: view === v ? "white" : "#9ca3af", transition: "all 0.15s" }}>
            {v === "plans" ? "💪 Plans" : v === "session" ? "▶ Session" : "📊 History"}
          </button>
        ))}
      </div>

      {view === "plans" && <WorkoutPlans onStartPlan={handleStartPlan} />}

      {view === "session" && !sessionStarted && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activePlan ? (
            <div style={{ background: "white", borderRadius: "24px", padding: "24px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", textAlign: "center" as const }}>
              <p style={{ fontSize: "36px", marginBottom: "12px" }}>💪</p>
              <p style={{ fontSize: "20px", fontWeight: 900, color: "#111118", marginBottom: "6px" }}>{activePlan.name}</p>
              <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600, marginBottom: "20px" }}>{activePlan.type} · {activePlan.exercises.length} exercises</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, justifyContent: "center", marginBottom: "24px" }}>
                {activePlan.exercises.map(ex => (
                  <span key={ex.name} style={{ padding: "5px 12px", borderRadius: "999px", background: "#e0e7ff", color: "#4338ca", fontSize: "11px", fontWeight: 700 }}>{ex.name}</span>
                ))}
              </div>
              <button onClick={() => setSessionStarted(true)}
                style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: "16px", color: "white", fontWeight: 800, fontSize: "15px", cursor: "pointer", fontFamily: "inherit" }}>
                Start Session ▶
              </button>
              <button onClick={handleCancel}
                style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "#9ca3af", fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit", marginTop: "8px" }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "24px", padding: "32px 20px", textAlign: "center" as const, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: "28px", marginBottom: "10px" }}>💪</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No plan selected</p>
              <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Go to Plans and tap "Start This Plan"</p>
              <button onClick={() => setView("plans")}
                style={{ marginTop: "16px", padding: "12px 24px", background: "#111118", border: "none", borderRadius: "14px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                Browse Plans →
              </button>
            </div>
          )}
        </div>
      )}

      {view === "session" && sessionStarted && activePlan && (
        <StructuredSession
          type={activePlan.type}
          planExercises={activePlan.exercises}
          onSave={handleComplete}
          onCancel={handleCancel}
        />
      )}

      {view === "history" && <WorkoutHistory />}
    </div>
  );
}