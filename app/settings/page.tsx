"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { UserSettings } from "@/types";

export default function SettingsPage() {
  const [s, setS] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState("");
  const { signOut } = useAuthStore();
  const router = useRouter();
  const { supported, subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();

  useEffect(() => { getSettings().then(setS); }, []);

  const update = (patch: Partial<UserSettings>) => setS(prev => prev ? { ...prev, ...patch } : prev);
  const updateMacro = (key: string, val: number) =>
    setS(prev => prev ? { ...prev, macroTargets: { ...prev.macroTargets, [key]: val } } : prev);

  const save = async () => {
    if (!s) return;
    await updateSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTestStatus("Sending...");
    try {
      await sendTestNotification();
      setTestStatus("Sent! Check your notifications.");
      setTimeout(() => setTestStatus(""), 5000);
    } catch (e: any) {
      setTestStatus("Error: " + e.message);
    }
  };

  if (!s) return <div style={{ padding: "32px", color: "#52525b", fontSize: "12px" }}>Loading...</div>;

  const field = (label: string, value: number | string, onChange: (v: string) => void, type = "number") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>{label}</p>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "16px", fontWeight: 600, outline: "none", boxSizing: "border-box" as const }} />
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>{title}</p>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Settings</p>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>Your Profile</p>
        </div>
        <Link href="/leaderboard" style={{ fontSize: "10px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>
          🏆 Leaderboard
        </Link>
      </div>

      {section("Profile", field("Display Name", s.name, v => update({ name: v }), "text"))}

      {section("Daily Targets", <>
        {field("Calories (kcal)", s.macroTargets.calories, v => updateMacro("calories", parseFloat(v)))}
        {field("Protein (g)", s.macroTargets.protein, v => updateMacro("protein", parseFloat(v)))}
        {field("Carbs (g)", s.macroTargets.carbs, v => updateMacro("carbs", parseFloat(v)))}
        {field("Fat (g)", s.macroTargets.fat, v => updateMacro("fat", parseFloat(v)))}
        {field("Fiber (g)", s.macroTargets.fiber, v => updateMacro("fiber", parseFloat(v)))}
      </>)}

      {section("Goals", <>
        {field("Hydration Goal (ml)", s.hydrationGoal, v => update({ hydrationGoal: parseInt(v) }))}
        {field("Sleep Goal (hours)", s.sleepGoal, v => update({ sleepGoal: parseFloat(v) }))}
        {field("Step Goal", s.stepGoal, v => update({ stepGoal: parseInt(v) }))}
      </>)}

      {section("Notifications",
        supported ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "white", fontSize: "14px", fontWeight: 600 }}>Daily Reminders</p>
                <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>
                  {subscribed ? "Enabled — you'll get daily nudges" : "Get reminded to log your data"}
                </p>
              </div>
              <button onClick={subscribed ? unsubscribe : subscribe} disabled={pushLoading}
                style={{ padding: "10px 18px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, background: subscribed ? "#27272a" : "white", color: subscribed ? "#71717a" : "black" }}>
                {pushLoading ? "..." : subscribed ? "Disable" : "Enable"}
              </button>
            </div>
            {(pushError) && (
              <p style={{ color: "#f87171", fontSize: "12px", background: "#27272a", padding: "12px 16px", borderRadius: "12px", wordBreak: "break-all" as const }}>
                {pushError}
              </p>
            )}
            {subscribed && (
              <button onClick={handleTest}
                style={{ width: "100%", padding: "12px", borderRadius: "12px", background: testStatus === "Sending..." ? "#27272a" : "none", border: "1px solid #27272a", color: testStatus.includes("Error") ? "#f87171" : testStatus.includes("Sent") ? "#34d399" : "#71717a", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", transition: "all 300ms" }}>
                {testStatus || "Send Test Notification"}
              </button>
            )}
          </div>
        ) : (
          <p style={{ color: "#52525b", fontSize: "12px" }}>Push notifications not supported in this browser.</p>
        )
      )}

      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
        <Link href="/finance" style={{ display: "block", padding: "16px 20px", color: "#a1a1aa", fontSize: "13px", fontWeight: 500, textDecoration: "none", borderBottom: "1px solid #27272a" }}>
          💰 Finance & Goals →
        </Link>
        <Link href="/friends" style={{ display: "block", padding: "16px 20px", color: "#a1a1aa", fontSize: "13px", fontWeight: 500, textDecoration: "none", borderBottom: "1px solid #27272a" }}>
          👥 Friends →
        </Link>
        <Link href="/leaderboard" style={{ display: "block", padding: "16px 20px", color: "#a1a1aa", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
          🏆 Leaderboard →
        </Link>
      </div>

      <button onClick={save} style={{
        width: "100%", padding: "16px", borderRadius: "16px",
        background: saved ? "#059669" : "white", color: saved ? "white" : "black",
        fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: "pointer", transition: "background 300ms"
      }}>
        {saved ? "Saved ✓" : "Save Settings"}
      </button>

      <button onClick={async () => { await signOut(); router.push("/auth"); }} style={{
        width: "100%", padding: "14px", borderRadius: "16px", background: "none",
        border: "1px solid #27272a", color: "#71717a", fontWeight: 600,
        fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer"
      }}>
        Sign Out
      </button>
    </div>
  );
}
