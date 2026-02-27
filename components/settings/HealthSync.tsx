"use client";
import { useState, useEffect } from "react";
import { getWebhookToken, generateWebhookToken, getHealthSyncLog } from "@/lib/supabase/queries";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase/client";

const STEPS = [
  {
    title: "Open Shortcuts app & create new shortcut",
    detail: 'Tap "+" in the top right. This will be your LifeOS Sync shortcut.',
  },
  {
    title: 'Add "Find Health Samples" for Steps',
    detail: 'Tap "Add Action", search "Find Health Samples". Tap the blue "Health Samples" pill → choose "Steps". Tap "Start Date" → "is in the last" → change 7 to 1 day.',
  },
  {
    title: 'Add "Get Details of Health Sample" for Steps',
    detail: 'Tap the "+" to add another action. Search "Get Details of Health Sample". Tap "Detail" → choose "Value". It should auto-reference your Steps samples.',
  },
  {
    title: 'Add "Find Health Samples" for Sleep',
    detail: 'Add another "Find Health Samples" action. Tap the blue pill → choose "Sleep". Set Start Date → "is in the last" → 1 day.',
  },
  {
    title: 'Add "Get Details of Health Sample" for Sleep',
    detail: 'Add "Get Details of Health Sample" again. Tap "Detail" → choose "Duration". It should auto-reference your Sleep samples.',
  },
  {
    title: 'Add "Get Contents of URL" — this sends data to LifeOS',
    detail: 'Add "Get Contents of URL". Set Method to GET. In the URL field, type the base URL below, then tap the variable icon {x} to insert Steps value after &steps= and Duration value after &sleep=. Delete any headers and request body.',
  },
  {
    title: 'Name & save the shortcut',
    detail: 'Tap the back arrow, name it "LifeOS Sync" and save.',
  },
  {
    title: 'Set up 4 automations for auto-sync',
    detail: 'Go to Automation tab → "+" → Time of Day. Create 4 automations at 12pm, 4pm, 8pm, and 11pm. For each one, select your LifeOS Sync shortcut and turn OFF "Ask Before Running". This way steps update throughout the day and sleep syncs at 11pm.',
  },
];

export default function HealthSync() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [tab, setTab] = useState<"status" | "history">("status");
  const [history, setHistory] = useState<Array<{ date: string; steps: number; sleep: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    const [t, log] = await Promise.all([getWebhookToken(), getHealthSyncLog()]);
    setToken(t);
    setSyncLog(log);
    setLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dates = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));

    const [stepsRes, sleepRes] = await Promise.all([
      supabase.from("step_entries").select("date, count").eq("user_id", user.id).in("date", dates),
      supabase.from("sleep_entries").select("date, duration").eq("user_id", user.id).in("date", dates),
    ]);

    const stepsMap: Record<string, number> = {};
    const sleepMap: Record<string, number> = {};
    (stepsRes.data || []).forEach((r: any) => stepsMap[r.date] = r.count);
    (sleepRes.data || []).forEach((r: any) => sleepMap[r.date] = r.duration);

    setHistory(dates.map(date => ({
      date,
      steps: stepsMap[date] || 0,
      sleep: sleepMap[date] || 0,
    })));
    setHistoryLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === "history" && history.length === 0) loadHistory();
  }, [tab]);

  const generate = async () => {
    setGenerating(true);
    const t = await generateWebhookToken();
    setToken(t);
    setGenerating(false);
    setShowSetup(true);
    setActiveStep(0);
  };

  const copy = (text: string, which: "token" | "url") => {
    navigator.clipboard.writeText(text);
    if (which === "token") { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000); }
    else { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }
  };

  const webhookUrl = token
    ? `https://lifeos-iota-wine.vercel.app/api/health?token=${token}&steps=`
    : "";

  const openShortcut = () => {
    window.location.href = "shortcuts://run-shortcut?name=LifeOS%20Sync";
  };

  if (loading) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Auto Sync</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "white", marginTop: "4px" }}>🍎 Apple Health</p>
          </div>
          {syncLog.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "9px", color: "#34d399", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>● Connected</p>
              <p style={{ fontSize: "10px", color: "#52525b", marginTop: "2px" }}>
                Last sync: {format(new Date(syncLog[0].synced_at), "MMM d, h:mm a")}
              </p>
            </div>
          )}
        </div>

        {!token ? (
          <>
            <p style={{ color: "#52525b", fontSize: "13px", lineHeight: "1.6" }}>
              Auto-sync steps and sleep from Apple Health using an iPhone Shortcut. Syncs 4x daily — no manual input needed.
            </p>
            <button onClick={generate} disabled={generating}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
              {generating ? "Generating..." : "Get Started"}
            </button>
          </>
        ) : (
          <>
            {/* Sync Now button */}
            <button onClick={openShortcut}
              style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span>⚡</span>
              <span>Sync Steps & Sleep Now</span>
            </button>
            <p style={{ color: "#52525b", fontSize: "11px", textAlign: "center" as const, marginTop: "-8px" }}>
              Auto-syncs at 12pm, 4pm, 8pm & 11pm daily
            </p>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", background: "#27272a", borderRadius: "12px", padding: "3px" }}>
              {(["status", "history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: "8px", borderRadius: "9px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b" }}>
                  {t === "status" ? "Status" : "📊 History"}
                </button>
              ))}
            </div>

            {tab === "status" && (
              <>
                {/* Token + URL */}
                <div style={{ background: "#27272a", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Shortcut Setup Values</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#18181b", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>URL (paste into Get Contents of URL)</p>
                      <p style={{ color: "#a1a1aa", fontSize: "10px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{webhookUrl}[Steps]&sleep=[Duration]</p>
                    </div>
                    <button onClick={() => copy(webhookUrl, "url")}
                      style={{ background: "none", border: "none", color: copiedUrl ? "#34d399" : "#3b82f6", fontSize: "11px", fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
                      {copiedUrl ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Setup guide */}
                <button onClick={() => setShowSetup(!showSetup)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "1px solid #27272a", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", width: "100%" }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>📱 Shortcut Setup Guide</p>
                  <p style={{ color: "#52525b", fontSize: "14px" }}>{showSetup ? "▾" : "▸"}</p>
                </button>

                {showSetup && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {STEPS.map((_, i) => (
                        <div key={i} onClick={() => setActiveStep(i)}
                          style={{ flex: 1, height: "3px", borderRadius: "999px", background: i <= activeStep ? "white" : "#27272a", cursor: "pointer" }} />
                      ))}
                    </div>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {activeStep + 1} of {STEPS.length}</p>

                    <div style={{ background: "#27272a", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <p style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>{STEPS[activeStep].title}</p>
                      <p style={{ color: "#a1a1aa", fontSize: "13px", lineHeight: "1.7" }}>{STEPS[activeStep].detail}</p>

                      {activeStep === 5 && (
                        <div style={{ background: "#18181b", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>URL to build:</p>
                          <p style={{ color: "#34d399", fontSize: "11px", fontFamily: "monospace", lineHeight: "1.8" }}>
                            {webhookUrl}<br/>
                            <span style={{ color: "#3b82f6" }}>[Value variable]</span><br/>
                            &sleep=<span style={{ color: "#3b82f6" }}>[Duration variable]</span>
                          </p>
                          <button onClick={() => copy(webhookUrl, "url")}
                            style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "11px", cursor: "pointer", padding: 0, textAlign: "left" as const }}>
                            {copiedUrl ? "✓ Copied" : "Copy base URL →"}
                          </button>
                        </div>
                      )}

                      {activeStep === 7 && (
                        <div style={{ background: "#18181b", borderRadius: "12px", padding: "12px" }}>
                          <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Create 4 automations at:</p>
                          {["12:00 PM", "4:00 PM", "8:00 PM", "11:00 PM"].map(time => (
                            <div key={time} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
                              <p style={{ color: "#a1a1aa", fontSize: "12px" }}>{time} — {time === "11:00 PM" ? "captures full day + sleep" : "mid-day step update"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      {activeStep > 0 && (
                        <button onClick={() => setActiveStep(p => p - 1)}
                          style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                          ← Back
                        </button>
                      )}
                      {activeStep < STEPS.length - 1 ? (
                        <button onClick={() => setActiveStep(p => p + 1)}
                          style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                          Next →
                        </button>
                      ) : (
                        <button onClick={() => setShowSetup(false)}
                          style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#059669", border: "none", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                          Done ✓
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent syncs */}
                {syncLog.length > 0 && (
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Recent Syncs</p>
                    <div style={{ background: "#27272a", borderRadius: "14px", overflow: "hidden" }}>
                      {syncLog.slice(0, 6).map((log, i) => (
                        <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < Math.min(syncLog.length, 6) - 1 ? "1px solid #18181b" : "none" }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <p style={{ fontSize: "12px" }}>{log.data_type === "steps" ? "👟" : "😴"}</p>
                            <p style={{ color: "#a1a1aa", fontSize: "12px" }}>
                              {log.data_type === "steps" ? `${Number(log.value).toLocaleString()} steps` : `${log.value}h sleep`}
                            </p>
                          </div>
                          <p style={{ color: "#52525b", fontSize: "10px" }}>{format(new Date(log.synced_at), "MMM d, h:mm a")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={generate} disabled={generating}
                  style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                  {generating ? "Regenerating..." : "Regenerate Token"}
                </button>
              </>
            )}

            {tab === "history" && (
              historyLoading ? (
                <div style={{ padding: "20px", textAlign: "center" as const }}>
                  <p style={{ color: "#52525b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Loading...</p>
                </div>
              ) : (
                <div style={{ background: "#27272a", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 14px", borderBottom: "1px solid #18181b" }}>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Date</p>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" as const }}>👟 Steps</p>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "right" as const }}>😴 Sleep</p>
                  </div>
                  {history.map((h, i) => {
                    const isToday = h.date === format(new Date(), "yyyy-MM-dd");
                    const hasSynced = h.steps > 0 || h.sleep > 0;
                    return (
                      <div key={h.date} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 14px", borderBottom: i < history.length - 1 ? "1px solid #18181b" : "none", opacity: hasSynced ? 1 : 0.4 }}>
                        <p style={{ color: isToday ? "white" : "#a1a1aa", fontSize: "12px", fontWeight: isToday ? 700 : 400 }}>
                          {isToday ? "Today" : format(new Date(h.date + "T12:00:00"), "EEE MMM d")}
                        </p>
                        <p style={{ color: h.steps >= 10000 ? "#34d399" : h.steps > 0 ? "white" : "#3f3f46", fontSize: "12px", fontWeight: 600, textAlign: "center" as const }}>
                          {h.steps > 0 ? h.steps.toLocaleString() : "—"}
                        </p>
                        <p style={{ color: h.sleep >= 7 ? "#34d399" : h.sleep > 0 ? "white" : "#3f3f46", fontSize: "12px", fontWeight: 600, textAlign: "right" as const }}>
                          {h.sleep > 0 ? `${h.sleep}h` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
