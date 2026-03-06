"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

interface WorkoutSession {
  id: string; date: string; type: string;
  duration: number; intensity: number; exercises: any[];
}

const TYPE_COLORS: Record<string, string> = {
  Push: "#3b82f6", Pull: "#8b5cf6", Legs: "#f59e0b",
  Upper: "#06b6d4", Lower: "#ec4899", Full: "#34d399",
  Cardio: "#f97316", Other: "#9ca3af",
};
const TYPE_BG: Record<string, string> = {
  Push: "#dbeafe", Pull: "#ede9fe", Legs: "#fef3c7",
  Upper: "#cffafe", Lower: "#fce7f3", Full: "#dcfce7",
  Cardio: "#fff7ed", Other: "#f3f4f6",
};

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"chart" | "list">("chart");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("workout_sessions").select("*").eq("user_id", user.id)
        .gte("date", format(subDays(new Date(), 27), "yyyy-MM-dd")).order("date", { ascending: true });
      setSessions(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (sessions.length === 0) return (
    <div style={{ background: "white", borderRadius: "24px", padding: "32px 20px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: "28px", marginBottom: "8px" }}>💪</p>
      <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>No workout history yet</p>
      <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Complete a session to see your progress</p>
    </div>
  );

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
    };
  });
  const maxMinutes = Math.max(...weeks.map(w => w.minutes), 1);

  const typeCounts: Record<string, number> = {};
  sessions.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["chart", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: "9px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, fontFamily: "inherit",
              background: view === v ? "#111118" : "transparent", color: view === v ? "white" : "#9ca3af" }}>
            {v === "chart" ? "📊 Volume" : "📋 History"}
          </button>
        ))}
      </div>

      {view === "chart" && (
        <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase" }}>Weekly Volume — 4 Weeks</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {weeks.map((w, i) => {
              const pct = w.minutes / maxMinutes;
              const isThis = i === 3;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
                  <p style={{ fontSize: "9px", color: isThis ? "#111118" : "#9ca3af", fontWeight: 700 }}>{w.minutes > 0 ? `${w.minutes}m` : ""}</p>
                  <div style={{ width: "100%", height: `${Math.max(pct * 100, w.minutes > 0 ? 8 : 2)}%`, borderRadius: "4px 4px 2px 2px", background: isThis ? "#111118" : w.minutes > 0 ? "#d1d5db" : "#f1f5f9", transition: "height 500ms ease-out" }} />
                  <p style={{ fontSize: "9px", color: isThis ? "#111118" : "#9ca3af", textAlign: "center", fontWeight: 600 }}>{w.label}</p>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "Sessions", value: sessions.length },
              { label: "Total Min", value: sessions.reduce((a, s) => a + (s.duration || 0), 0) },
              { label: "Avg RPE", value: sessions.length > 0 ? (sessions.reduce((a, s) => a + (s.intensity || 0), 0) / sessions.length).toFixed(1) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f7f8fc", borderRadius: "14px", padding: "12px", textAlign: "center" as const }}>
                <p style={{ fontSize: "20px", fontWeight: 900, color: "#111118" }}>{value}</p>
                <p style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: "2px", fontWeight: 700 }}>{label}</p>
              </div>
            ))}
          </div>

          {(() => {
            const exerciseMap: Record<string, {date: string, weight: number}[]> = {};
            sessions.forEach(s => {
              (s.exercises || []).forEach((ex: any) => {
                if (!ex.name) return;
                const sets = (ex.sets || []).filter((set: any) => set.completed && set.weight > 0);
                if (sets.length === 0) return;
                const maxWeight = Math.max(...sets.map((set: any) => parseFloat(set.weight) || 0));
                if (!exerciseMap[ex.name]) exerciseMap[ex.name] = [];
                exerciseMap[ex.name].push({ date: s.date, weight: maxWeight });
              });
            });
            const tracked = Object.entries(exerciseMap).filter(([, e]) => e.length >= 2).slice(0, 4);
            if (!tracked.length) return null;
            return (
              <div>
                <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase" as const, marginBottom: "10px" }}>Exercise Progress</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tracked.map(([name, entries]) => {
                    const first = entries[0].weight;
                    const last = entries[entries.length - 1].weight;
                    const diff = last - first;
                    const maxW = Math.max(...entries.map(e => e.weight));
                    return (
                      <div key={name} style={{ background: "#f7f8fc", borderRadius: "16px", padding: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <p style={{ color: "#111118", fontSize: "13px", fontWeight: 700 }}>{name}</p>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#9ca3af", background: diff > 0 ? "#dcfce7" : diff < 0 ? "#fee2e2" : "#f3f4f6", padding: "2px 8px", borderRadius: "6px" }}>
                            {diff > 0 ? "+" : ""}{diff !== 0 ? `${diff}lbs` : "→"} {diff > 0 ? "↑" : diff < 0 ? "↓" : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "32px" }}>
                          {entries.map((e, i) => (
                            <div key={i} style={{ flex: 1, height: `${Math.max((e.weight / maxW) * 100, 15)}%`, borderRadius: "2px 2px 1px 1px", background: i === entries.length - 1 ? "#22c55e" : "#e5e7eb" }} />
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                          <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>{first}lbs start</p>
                          <p style={{ fontSize: "10px", color: "#111118", fontWeight: 700 }}>{last}lbs now</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {typeEntries.length > 0 && (
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "10px" }}>By Type</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {typeEntries.map(([type, count]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[type] || "#9ca3af", flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: "12px", color: "#374151", fontWeight: 700 }}>{type}</p>
                    <div style={{ flex: 2, height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${(count / sessions.length) * 100}%`, height: "100%", background: TYPE_COLORS[type] || "#9ca3af", borderRadius: "999px" }} />
                    </div>
                    <p style={{ fontSize: "11px", color: "#9ca3af", width: "24px", textAlign: "right", fontWeight: 700 }}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        <div style={{ background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          {[...sessions].reverse().slice(0, 10).map((s, i, arr) => (
            <div key={s.id} style={{ padding: "14px 18px", borderBottom: i < arr.length - 1 ? "1px solid #f7f8fc" : "none", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "10px", background: TYPE_BG[s.type] || "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                💪
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#111118", fontSize: "13px", fontWeight: 700 }}>{s.type}</p>
                <p style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px", fontWeight: 600 }}>
                  {format(new Date(s.date + "T12:00:00"), "MMM d")} · {s.duration}min · RPE {s.intensity}
                </p>
              </div>
              {s.exercises?.length > 0 && (
                <span style={{ fontSize: "11px", color: "#9ca3af", background: "#f7f8fc", padding: "3px 8px", borderRadius: "6px", fontWeight: 600 }}>{s.exercises.length} ex</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}