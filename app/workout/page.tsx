"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { WorkoutSession } from "@/types";
import WorkoutTypeSelector from "@/components/workout/WorkoutTypeSelector";
import QuickLogForm from "@/components/workout/QuickLogForm";
import StructuredSession from "@/components/workout/StructuredSession";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import { format } from "date-fns";

type Mode = "select" | "quick" | "structured" | "done";

export default function WorkoutPage() {
  const [mode, setMode] = useState<Mode>("select");
  const [selectedType, setSelectedType] = useState("Push");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [todaySession, setTodaySession] = useState<WorkoutSession | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false });
    const mapped: WorkoutSession[] = (data || []).map((r: any) => ({
      id: r.id, date: r.date, timestamp: r.timestamp,
      type: r.type, duration: r.duration, intensity: r.intensity,
      exercises: r.exercises, completed: r.completed,
    }));
    setSessions(mapped);
    const today = mapped.find(s => s.date === format(new Date(), "yyyy-MM-dd"));
    setTodaySession(today || null);
  };

  useEffect(() => { load(); }, []);

  const onSave = () => { load(); setMode("done"); };

  if (mode === "quick") return (
    <div className="space-y-4">
      <div className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Workout</p>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>Quick Log</p>
        </div>
        <button onClick={() => setMode("select")} style={{ fontSize: "11px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer" }}>Back</button>
      </div>
      <QuickLogForm onSave={onSave} />
    </div>
  );

  if (mode === "structured") return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Workout</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{selectedType} Day</p>
      </div>
      <StructuredSession type={selectedType} onSave={onSave} onCancel={() => setMode("select")} />
    </div>
  );

  if (mode === "done") return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Workout</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>Session Complete</p>
      </div>
      {todaySession && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "24px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", textAlign: "center" }}>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>{todaySession.type}</p>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Type</p>
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>{todaySession.duration}m</p>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Duration</p>
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>{todaySession.intensity}</p>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>RPE</p>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setMode("select")} style={{ width: "100%", padding: "16px", borderRadius: "16px", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", background: "none", cursor: "pointer" }}>
        Back
      </button>
      <WorkoutHistory />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Workout</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>

      {todaySession && (
        <div style={{ background: "#052e16", border: "1px solid #14532d", borderRadius: "24px", padding: "16px 20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", color: "#34d399", textTransform: "uppercase" }}>Today's Session Logged</p>
          <p style={{ color: "white", fontWeight: 600, marginTop: "4px" }}>{todaySession.type} · {todaySession.duration}min · RPE {todaySession.intensity}</p>
        </div>
      )}

      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <WorkoutTypeSelector selected={selectedType} onSelect={setSelectedType} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button
            onClick={() => setMode("quick")}
            style={{ padding: "16px", borderRadius: "16px", border: "1px solid #3f3f46", color: "#d4d4d8", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "none", cursor: "pointer" }}
          >
            Quick Log
          </button>
          <button
            onClick={() => setMode("structured")}
            style={{ padding: "16px", borderRadius: "16px", background: "white", color: "black", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
          >
            Start Session
          </button>
        </div>
      </div>

      <WorkoutHistory />
    </div>
  );
}
