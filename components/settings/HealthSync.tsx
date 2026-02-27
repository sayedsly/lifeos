"use client";
import { useState, useEffect } from "react";
import { getWebhookToken, generateWebhookToken, getHealthSyncLog } from "@/lib/supabase/queries";
import { format } from "date-fns";

const STEPS = [
  {
    title: "Open Shortcuts app",
    detail: 'Tap "+" in the top right to create a new shortcut.',
  },
  {
    title: 'Add "Find Health Samples"',
    detail: 'Tap "Add Action", search "Find Health Samples" and select it. Tap the blue "Health Samples" pill and choose Step Count. Set the date filter to "Last Day".',
  },
  {
    title: 'Add "Get Details of Health Sample"',
    detail: 'Tap "+" to add another action. Search "Get Details of Health Sample". Tap "Detail" and choose "Value". The "Health Sample" should auto-fill from step 1.',
  },
  {
    title: "Rename the result to Steps",
    detail: 'Tap the result variable and rename it "Steps" so you can reference it later.',
  },
  {
    title: 'Add another "Find Health Samples" for Sleep',
    detail: 'Add another "Find Health Samples" action. Tap the blue pill and choose "Sleep Analysis". Set the date filter to "Last Day".',
  },
  {
    title: 'Add "Get Details" for Sleep duration',
    detail: 'Add "Get Details of Health Sample" again. Tap "Detail" and choose "Duration in Hours". Rename this result to "SleepHours".',
  },
  {
    title: 'Add "Get Contents of URL"',
    detail: 'Search "Get Contents of URL". Set Method to POST. Set the URL to your webhook URL below. Tap "Add new field" → JSON. Add three keys: "token" (paste your token), "steps" (tap the variable icon and pick Steps), "sleep_hours" (pick SleepHours).',
  },
  {
    title: "Set up Automation",
    detail: 'Go to the Automation tab in Shortcuts. Tap "+", choose "Time of Day", set it to 8:00 AM daily. Select your shortcut and turn off "Ask Before Running".',
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

  useEffect(() => {
    Promise.all([getWebhookToken(), getHealthSyncLog()]).then(([t, log]) => {
      setToken(t);
      setSyncLog(log);
      setLoading(false);
    });
  }, []);

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

  const webhookUrl = "https://lifeos-iota-wine.vercel.app/api/health";

  if (loading) return null;

  return (
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
            Auto-sync your steps and sleep from Apple Health every day using an iPhone Shortcut. One-time setup, runs automatically at 8am.
          </p>
          <button onClick={generate} disabled={generating}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {generating ? "Generating..." : "Generate Token & Start Setup"}
          </button>
        </>
      ) : (
        <>
          {/* Token + URL copy section */}
          <div style={{ background: "#27272a", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>You'll need these during setup</p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#18181b", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>Webhook URL</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{webhookUrl}</p>
              </div>
              <button onClick={() => copy(webhookUrl, "url")}
                style={{ background: "none", border: "none", color: copiedUrl ? "#34d399" : "#3b82f6", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
                {copiedUrl ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#18181b", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>Your Token</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{token}</p>
              </div>
              <button onClick={() => copy(token, "token")}
                style={{ background: "none", border: "none", color: copiedToken ? "#34d399" : "#3b82f6", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
                {copiedToken ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Setup guide toggle */}
          <button onClick={() => setShowSetup(!showSetup)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "1px solid #27272a", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", width: "100%" }}>
            <p style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>📱 Shortcut Setup Guide</p>
            <p style={{ color: "#52525b", fontSize: "14px" }}>{showSetup ? "▾" : "▸"}</p>
          </button>

          {showSetup && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Step progress */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                {STEPS.map((_, i) => (
                  <div key={i} onClick={() => setActiveStep(i)} style={{ flex: 1, height: "3px", borderRadius: "999px", background: i <= activeStep ? "white" : "#27272a", cursor: "pointer", transition: "background 200ms" }} />
                ))}
              </div>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {activeStep + 1} of {STEPS.length}</p>

              {/* Active step card */}
              <div style={{ background: "#27272a", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>{STEPS[activeStep].title}</p>
                <p style={{ color: "#a1a1aa", fontSize: "13px", lineHeight: "1.7" }}>{STEPS[activeStep].detail}</p>

                {/* Step-specific helpers */}
                {activeStep === 6 && token && (
                  <div style={{ background: "#18181b", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>JSON Body fields to add:</p>
                    {[
                      { key: "token", value: token.slice(0, 16) + "...", hint: "Paste your token (copied above)" },
                      { key: "steps", value: "Steps variable", hint: "Tap 🔵 variable icon → pick Steps" },
                      { key: "sleep_hours", value: "SleepHours variable", hint: "Tap 🔵 variable icon → pick SleepHours" },
                    ].map(({ key, value, hint }) => (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ color: "white", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>{key}</p>
                          <p style={{ color: "#52525b", fontSize: "10px", marginTop: "2px" }}>{hint}</p>
                        </div>
                        <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nav buttons */}
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

          {/* Sync log */}
          {syncLog.length > 0 && (
            <div>
              <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Recent Syncs</p>
              <div style={{ background: "#27272a", borderRadius: "14px", overflow: "hidden" }}>
                {syncLog.slice(0, 5).map((log, i) => (
                  <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < Math.min(syncLog.length, 5) - 1 ? "1px solid #18181b" : "none" }}>
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
    </div>
  );
}
