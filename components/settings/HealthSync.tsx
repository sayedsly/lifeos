"use client";
import { useState, useEffect } from "react";
import { getWebhookToken, generateWebhookToken, getHealthSyncLog } from "@/lib/supabase/queries";
import { format } from "date-fns";

export default function HealthSync() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [showSetup, setShowSetup] = useState(false);

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
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const webhookUrl = `https://lifeos-iota-wine.vercel.app/api/health`;

  const shortcutJson = token ? JSON.stringify({
    steps: "<<stepCount>>",
    sleep_hours: "<<sleepHours>>",
    token,
    date: "<<date>>"
  }, null, 2) : "";

  if (loading) return null;

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Auto Sync</p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "white", marginTop: "4px" }}>Apple Health</p>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ color: "#52525b", fontSize: "13px", lineHeight: "1.6" }}>
            Connect Apple Health to automatically sync your steps and sleep every day via an Apple Shortcut.
          </p>
          <button onClick={generate} disabled={generating}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {generating ? "Generating..." : "Generate Token"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Token display */}
          <div style={{ background: "#27272a", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{token}</p>
            <button onClick={() => copy(token)} style={{ background: "none", border: "none", color: copied ? "#34d399" : "#52525b", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          {/* Setup instructions toggle */}
          <button onClick={() => setShowSetup(!showSetup)}
            style={{ background: "none", border: "1px solid #27272a", borderRadius: "12px", padding: "12px 16px", color: "#a1a1aa", fontSize: "12px", cursor: "pointer", textAlign: "left" as const }}>
            {showSetup ? "▾ Hide setup instructions" : "▸ How to set up the Shortcut"}
          </button>

          {showSetup && (
            <div style={{ background: "#27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Setup Guide</p>

              {[
                "Open the Shortcuts app on your iPhone",
                'Tap "+" to create a new shortcut',
                'Add action: "Get Health Samples" → Steps → Last Day',
                'Add action: "Get Health Samples" → Sleep Analysis → Last Night',
                'Add action: "Get Contents of URL" and configure:',
                'Set automation to run daily (e.g. 8am)',
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#18181b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#52525b" }}>{i + 1}</p>
                  </div>
                  <p style={{ color: "#a1a1aa", fontSize: "12px", lineHeight: "1.5" }}>{step}</p>
                </div>
              ))}

              <div style={{ background: "#18181b", borderRadius: "12px", padding: "12px" }}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>URL Config</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace", marginBottom: "4px" }}>URL: {webhookUrl}</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace" }}>Method: POST</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace", marginTop: "4px" }}>Body (JSON):</p>
                <div style={{ background: "#27272a", borderRadius: "8px", padding: "8px", marginTop: "6px" }}>
                  <p style={{ color: "#34d399", fontSize: "10px", fontFamily: "monospace", whiteSpace: "pre" as const }}>
                    {`{
  "token": "${token.slice(0, 8)}...",
  "steps": [Step Count],
  "sleep_hours": [Sleep Hours],
  "date": [Current Date]
}`}
                  </p>
                </div>
                <button onClick={() => copy(webhookUrl)} style={{ marginTop: "8px", background: "none", border: "none", color: "#3b82f6", fontSize: "11px", cursor: "pointer", padding: 0 }}>
                  Copy webhook URL
                </button>
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
                      <p style={{ color: "#a1a1aa", fontSize: "12px" }}>{log.data_type === "steps" ? `${log.value.toLocaleString()} steps` : `${log.value}h sleep`}</p>
                    </div>
                    <p style={{ color: "#52525b", fontSize: "10px" }}>{format(new Date(log.synced_at), "MMM d")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={generate} disabled={generating}
            style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {generating ? "Regenerating..." : "Regenerate Token"}
          </button>
        </div>
      )}
    </div>
  );
}
