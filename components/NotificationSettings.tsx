"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const DOMAINS = [
  { key: "nutrition", emoji: "🥗", label: "Nutrition", desc: "Meal logging reminders", defaultTimes: ["08:00", "12:30", "19:00"] },
  { key: "hydration", emoji: "💧", label: "Hydration", desc: "Water reminders", defaultTimes: ["09:00", "11:00", "14:00", "16:00"] },
  { key: "sleep", emoji: "😴", label: "Sleep", desc: "Bedtime reminder", defaultTimes: ["22:00"] },
  { key: "steps", emoji: "👟", label: "Steps", desc: "Move reminder", defaultTimes: ["10:00", "15:00"] },
  { key: "tasks", emoji: "✅", label: "Tasks", desc: "Daily checklist", defaultTimes: ["08:30"] },
  { key: "workout", emoji: "💪", label: "Workout", desc: "Gym reminder", defaultTimes: ["07:00"] },
  { key: "finance", emoji: "💰", label: "Finance", desc: "Expense logging", defaultTimes: ["20:00"] },
  { key: "momentum", emoji: "⚡", label: "Momentum", desc: "Daily score recap", defaultTimes: ["21:00"] },
];

const PRESETS = [
  { label: "🌅 Morning", time: "07:00" },
  { label: "☀️ Midday", time: "12:00" },
  { label: "🌆 Evening", time: "18:00" },
  { label: "🌙 Night", time: "21:00" },
];

interface DomainPref { enabled: boolean; times: string[]; }

export default function NotificationSettings({ subscribed }: { subscribed: boolean }) {
  const [prefs, setPrefs] = useState<Record<string, DomainPref>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id);
      const map: Record<string, DomainPref> = {};
      DOMAINS.forEach(d => {
        const row = (data || []).find(r => r.domain === d.key);
        map[d.key] = { enabled: row?.enabled ?? false, times: row?.times ?? d.defaultTimes };
      });
      setPrefs(map);
    };
    if (subscribed) load();
  }, [subscribed]);

  const save = async (domain: string, pref: DomainPref) => {
    setSaving(domain);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notification_preferences").upsert({
      id: `${user.id}-${domain}`, user_id: user.id, domain,
      enabled: pref.enabled, times: pref.times,
    });
    setPrefs(p => ({ ...p, [domain]: pref }));
    setSaving(null);
  };

  const toggle = (domain: string) => {
    const p = prefs[domain];
    if (!p) return;
    save(domain, { ...p, enabled: !p.enabled });
  };

  const addTime = (domain: string, time: string) => {
    const p = prefs[domain];
    if (!p || p.times.includes(time)) return;
    const updated = { ...p, times: [...p.times, time].sort() };
    save(domain, updated);
  };

  const removeTime = (domain: string, time: string) => {
    const p = prefs[domain];
    if (!p) return;
    save(domain, { ...p, times: p.times.filter(t => t !== time) });
  };

  if (!subscribed) return (
    <div style={{ background: "#f7f8fc", borderRadius: "16px", padding: "16px", textAlign: "center" as const }}>
      <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>Enable notifications above to customize reminders</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", padding: "4px 0" }}>Customize Reminders</p>
      {DOMAINS.map(d => {
        const pref = prefs[d.key] || { enabled: false, times: d.defaultTimes };
        const isExpanded = expanded === d.key;
        return (
          <div key={d.key} style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
              <span style={{ fontSize: "20px" }}>{d.emoji}</span>
              <div style={{ flex: 1 }} onClick={() => { if(pref.enabled) setExpanded(isExpanded ? null : d.key); }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{d.label}</p>
                <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>
                  {pref.enabled ? pref.times.join(", ") : d.desc}
                </p>
              </div>
              {saving === d.key && <p style={{ fontSize: "10px", color: "#9ca3af" }}>saving...</p>}
              {/* Toggle */}
              <div onClick={() => toggle(d.key)} style={{ width: 44, height: 26, borderRadius: "999px", background: pref.enabled ? "#6366f1" : "#e5e7eb", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: pref.enabled ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
              </div>
            </div>

            {/* Expanded time picker */}
            {pref.enabled && isExpanded && (
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Current times */}
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>Scheduled Times</p>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                    {pref.times.map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#e0e7ff", borderRadius: "8px", padding: "5px 10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#4338ca" }}>{t}</span>
                        <button onClick={() => removeTime(d.key, t)}
                          style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "14px", padding: "0", lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preset times */}
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>Quick Add</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                    {PRESETS.map(p => (
                      <button key={p.time} onClick={() => addTime(d.key, p.time)} disabled={pref.times.includes(p.time)}
                        style={{ padding: "6px 12px", borderRadius: "999px", border: "none", cursor: pref.times.includes(p.time) ? "default" : "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 700,
                          background: pref.times.includes(p.time) ? "#f1f5f9" : "#f7f8fc",
                          color: pref.times.includes(p.time) ? "#d1d5db" : "#6b7280" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom time */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="time" value={newTime[d.key] || ""} onChange={e => setNewTime(n => ({ ...n, [d.key]: e.target.value }))}
                    style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit" }} />
                  <button onClick={() => { if (newTime[d.key]) { addTime(d.key, newTime[d.key]); setNewTime(n => ({ ...n, [d.key]: "" })); } }}
                    style={{ padding: "8px 16px", background: "#111118", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}