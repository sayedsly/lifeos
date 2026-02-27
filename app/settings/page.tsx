"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { UserSettings } from "@/types";

const DEFAULT_WEIGHTS = { nutrition: 30, workout: 20, sleep: 15, tasks: 15, finance: 10, steps: 10 };

export default function SettingsPage() {
  const [s, setS] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [homeWidgets, setHomeWidgets] = useState({ streak: true, trendGraph: true, hydrationChart: true, sleepChart: true });
  const { signOut } = useAuthStore();
  const router = useRouter();
  const { supported, subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    getSettings().then(s => {
      setS(s);
      if (s.momentumWeights) setWeights(s.momentumWeights as typeof DEFAULT_WEIGHTS);
      if ((s as any).homeWidgets) setHomeWidgets((s as any).homeWidgets);
    });
  }, []);

  const update = (patch: Partial<UserSettings>) => setS(prev => prev ? { ...prev, ...patch } : prev);
  const updateMacro = (key: string, val: number) =>
    setS(prev => prev ? { ...prev, macroTargets: { ...prev.macroTargets, [key]: val } } : prev);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const save = async () => {
    if (!s) return;
    await updateSettings({ ...s, momentumWeights: weights, homeWidgets } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>{label}</p>
      <button onClick={() => onChange(!value)} style={{
        width: "44px", height: "26px", borderRadius: "999px", border: "none", cursor: "pointer",
        background: value ? "white" : "#27272a", position: "relative", transition: "background 200ms",
      }}>
        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: value ? "black" : "#52525b", position: "absolute", top: "3px", left: value ? "21px" : "3px", transition: "left 200ms" }} />
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>More</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>Settings</p>
      </div>

      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
        {[{ href: "/workout", label: "💪 Workout" }, { href: "/finance", label: "💰 Finance & Goals" }].map(({ href, label }, i, arr) => (
          <Link key={href} href={href} style={{ display: "block", padding: "16px 20px", color: "#a1a1aa", fontSize: "13px", fontWeight: 500, textDecoration: "none", borderBottom: i < arr.length - 1 ? "1px solid #27272a" : "none" }}>
            {label} →
          </Link>
        ))}
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

      {/* Momentum weights */}
      {section("Momentum Weights", <>
        <p style={{ color: "#52525b", fontSize: "12px", lineHeight: "1.5" }}>
          Adjust how much each module contributes to your score. Total must equal 100.
        </p>
        {Object.entries(weights).map(([key, val]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "white", fontWeight: 600, width: "72px", textTransform: "capitalize" }}>{key}</p>
            <input type="range" min={0} max={50} value={val}
              onChange={e => setWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
              style={{ flex: 1 }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "white", width: "32px", textAlign: "right" }}>{val}</p>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", borderTop: "1px solid #27272a" }}>
          <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total</p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: totalWeight === 100 ? "#34d399" : "#f87171" }}>{totalWeight}/100</p>
        </div>
        {totalWeight !== 100 && (
          <p style={{ color: "#f87171", fontSize: "11px" }}>Total must equal exactly 100 to save.</p>
        )}
      </>)}

      {/* Home widgets */}
      {section("Home Screen", <>
        {toggle("Streak Card", homeWidgets.streak, v => setHomeWidgets(p => ({ ...p, streak: v })))}
        {toggle("7-Day Trend Graph", homeWidgets.trendGraph, v => setHomeWidgets(p => ({ ...p, trendGraph: v })))}
        {toggle("Hydration History Chart", homeWidgets.hydrationChart, v => setHomeWidgets(p => ({ ...p, hydrationChart: v })))}
        {toggle("Sleep History Chart", homeWidgets.sleepChart, v => setHomeWidgets(p => ({ ...p, sleepChart: v })))}
      </>)}

      {supported && section("Notifications",
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "white", fontSize: "14px", fontWeight: 600 }}>Daily Reminders</p>
            <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>{subscribed ? "Enabled" : "Get reminded to log your data"}</p>
          </div>
          <button onClick={subscribed ? unsubscribe : subscribe} disabled={pushLoading}
            style={{ padding: "10px 18px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const, background: subscribed ? "#27272a" : "white", color: subscribed ? "#71717a" : "black" }}>
            {pushLoading ? "..." : subscribed ? "Disable" : "Enable"}
          </button>
        </div>
      )}

      <button onClick={save} disabled={totalWeight !== 100} style={{
        width: "100%", padding: "16px", borderRadius: "16px",
        background: saved ? "#059669" : totalWeight !== 100 ? "#27272a" : "white",
        color: saved ? "white" : totalWeight !== 100 ? "#52525b" : "black",
        fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: totalWeight !== 100 ? "default" : "pointer", transition: "background 300ms"
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
