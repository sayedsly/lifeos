"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

interface WorkoutSession {
  id: string;
  date: string;
  type: string;
  duration: number;
  intensity: number;
  exercises: any[];
}

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"chart" | "list">("chart");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(subDays(new Date(), 27), "yyyy-MM-dd"))
        .order("date", { ascending: true });
      setSessions(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (sessions.length === 0) return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "24px 20px", textAlign: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No workout history yet</p>
    </div>
  );

  // Build 4-week chart data
  const weeks = Array.from({ length: 4 }, (_, wi) => {
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.date + "T12:00:00");
      const weeksAgo = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weeksAgo === (3 - wi);
    });
    return {
      label: wi === 3 ? "This wk" : wi === 2 ? "Last wk" : `${4 - wi}w ago`,
      count: weekSessions.length,
      minutes: weekSessions.reduce((a, s) => a + (s.duration || 0), 0),
      avgRPE: weekSessions.length > 0
        ? Math.round(weekSessions.reduce((a, s) => a + (s.intensity || 0), 0) / weekSessions.length * 10) / 10
        : 0,
    };
  });

  const maxMinutes = Math.max(...weeks.map(w => w.minutes), 1);

  // Type breakdown for recent sessions
  const typeCounts: Record<string, number> = {};
  sessions.forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  const typeColors: Record<string, string> = {
    Push: "#3b82f6", Pull: "#8b5cf6", Legs: "#f59e0b",
    Upper: "#06b6d4", Lower: "#ec4899", Full: "#34d399",
    Cardio: "#f97316", Other: "#71717a",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toggle */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "4px" }}>
        {(["chart", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
            background: view === v ? "white" : "transparent", color: view === v ? "black" : "#52525b",
          }}>{v === "chart" ? "📊 Volume" : "📋 History"}</button>
        ))}
      </div>

      {view === "chart" && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Weekly Volume — 4 Weeks</p>

          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {weeks.map((w, i) => {
              const pct = w.minutes / maxMinutes;
              const isThis = i === 3;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
                  <p style={{ fontSize: "9px", color: isThis ? "white" : "#52525b", fontWeight: 700 }}>{w.minutes > 0 ? `${w.minutes}m` : ""}</p>
                  <div style={{ width: "100%", height: `${Math.max(pct * 100, w.minutes > 0 ? 8 : 2)}%`, borderRadius: "4px 4px 2px 2px", background: isThis ? "white" : w.minutes > 0 ? "#3f3f46" : "#27272a", transition: "height 500ms ease-out" }} />
                  <p style={{ fontSize: "9px", color: isThis ? "white" : "#52525b", textAlign: "center" }}>{w.label}</p>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "Sessions", value: sessions.length },
              { label: "Total Min", value: sessions.reduce((a, s) => a + (s.duration || 0), 0) },
              { label: "Avg RPE", value: sessions.length > 0 ? (sessions.reduce((a, s) => a + (s.intensity || 0), 0) / sessions.length).toFixed(1) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#27272a", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "white" }}>{value}</p>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Exercise progress */}
          {(() => {
            const exerciseMap: Record<string, {date: string, weight: number, reps: number}[]> = {};
            sessions.forEach(s => {
              (s.exercises || []).forEach((ex: any) => {
                if (!ex.name) return;
                const sets = (ex.sets || []).filter((set: any) => set.completed && set.weight > 0);
                if (sets.length === 0) return;
                const maxWeight = Math.max(...sets.map((set: any) => parseFloat(set.weight) || 0));
                const avgReps = Math.round(sets.reduce((a: number, set: any) => a + (parseInt(set.reps) || 0), 0) / sets.length);
                if (!exerciseMap[ex.name]) exerciseMap[ex.name] = [];
                exerciseMap[ex.name].push({ date: s.date, weight: maxWeight, reps: avgReps });
              });
            });
            const tracked = Object.entries(exerciseMap).filter(([, entries]) => entries.length >= 2).slice(0, 4);
            if (tracked.length === 0) return null;
            return (
              <div>
                <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" as const, marginBottom: "10px" }}>Exercise Progress</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tracked.map(([name, entries]) => {
                    const first = entries[0].weight;
                    const last = entries[entries.length - 1].weight;
                    const diff = last - first;
                    const maxW = Math.max(...entries.map(e => e.weight));
                    return (
                      <div key={name} style={{ background: "#27272a", borderRadius: "14px", padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <p style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{name}</p>
                          <p style={{ fontSize: "11px", color: diff > 0 ? "#34d399" : diff < 0 ? "#f87171" : "#52525b", fontWeight: 700 }}>
                            {diff > 0 ? "+" : ""}{diff !== 0 ? `${diff}lbs` : "→"} {diff > 0 ? "↑" : diff < 0 ? "↓" : ""}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "32px" }}>
                          {entries.map((e, i) => (
                            <div key={i} style={{ flex: 1, height: `${Math.max((e.weight / maxW) * 100, 15)}%`, borderRadius: "2px 2px 1px 1px", background: i === entries.length - 1 ? "#34d399" : "#3f3f46" }} />
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                          <p style={{ fontSize: "9px", color: "#52525b" }}>{first}lbs</p>
                          <p style={{ fontSize: "9px", color: "white", fontWeight: 600 }}>{last}lbs now</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Type breakdown */}
          {typeEntries.length > 0 && (
            <div>
              <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "10px" }}>By Type</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {typeEntries.map(([type, count]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: typeColors[type] || "#71717a", flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: "12px", color: "white", fontWeight: 600 }}>{type}</p>
                    <div style={{ flex: 2, height: "3px", background: "#27272a", borderRadius: "999px" }}>
                      <div style={{ width: `${(count / sessions.length) * 100}%`, height: "100%", background: typeColors[type] || "#71717a", borderRadius: "999px" }} />
                    </div>
                    <p style={{ fontSize: "11px", color: "#52525b", width: "24px", textAlign: "right" }}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
          {[...sessions].reverse().slice(0, 10).map((s, i, arr) => (
            <div key={s.id} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid #27272a" : "none", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: typeColors[s.type] || "#71717a", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{s.type}</p>
                <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>
                  {format(new Date(s.date + "T12:00:00"), "MMM d")} · {s.duration}min · RPE {s.intensity}
                </p>
              </div>
              {s.exercises?.length > 0 && (
                <p style={{ fontSize: "11px", color: "#3f3f46" }}>{s.exercises.length} exercises</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
