"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useAuthStore } from "@/store/useAuthStore";
import MomentumCard from "@/components/momentum/MomentumCard";
import ActivityRings from "@/components/momentum/ActivityRings";
import HydrationCard from "@/components/momentum/HydrationCard";
import SleepCard from "@/components/momentum/SleepCard";
import StepsCard from "@/components/momentum/StepsCard";
import TrendGraph from "@/components/momentum/TrendGraph";
import SleepLogModal from "@/components/momentum/SleepLogModal";
import HydrationHistory from "@/components/momentum/HydrationHistory";
import SleepHistory from "@/components/momentum/SleepHistory";
import StreakCard from "@/components/momentum/StreakCard";
import CalorieBudgetCard from "@/components/momentum/CalorieBudgetCard";
import BodyWeightCard from "@/components/momentum/BodyWeightCard";
import ShareCard from "@/components/momentum/ShareCard";
import Onboarding from "@/components/Onboarding";
import {
  getMomentumForDate, getHydrationForDate, getSleepForDate,
  getSettings, addHydrationEntry, getLast7DaysMomentum,
  getStepsForDate, getCurrentStreak, getNutritionTotals,
} from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import type { SleepEntry, MomentumSnapshot } from "@/types";
import { format, subDays } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function HomePage() {
  const { momentum, refreshMomentum } = useLifeStore();
  const { user, loading: authLoading } = useAuthStore();
  const [delta, setDelta] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [hydrationGoal, setHydrationGoal] = useState(2500);
  const [sleep, setSleep] = useState<SleepEntry | null>(null);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [steps, setSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [trend, setTrend] = useState<MomentumSnapshot[]>([]);
  const [streak, setStreak] = useState(0);
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [ringsConfig, setRingsConfig] = useState<[string,string,string]>(["steps", "nutrition", "sleep"]);

  const loadAll = async () => {
    try {
      const [s, h, sl, stepCount, trendData, streakCount, nutritionTotals, prevMomentum] = await Promise.all([
        getSettings(),
        getHydrationForDate(today()),
        getSleepForDate(today()),
        getStepsForDate(today()),
        getLast7DaysMomentum(),
        getCurrentStreak(),
        getNutritionTotals(today()),
        getMomentumForDate(format(subDays(new Date(), 1), "yyyy-MM-dd")),
      ]);
      setSettings(s);
      setHydrationGoal(s.hydrationGoal);
      setSleepGoal(s.sleepGoal);
      setStepGoal(s.stepGoal);
      setHydration(h);
      setSleep(sl || null);
      setSteps(stepCount);
      setTrend(trendData);
      setStreak(streakCount);
      setCaloriesToday((nutritionTotals as any)?.calories || 0);
      if (s.ringsConfig && s.ringsConfig.length === 3) setRingsConfig(s.ringsConfig as [string,string,string]);
      if (!s.name || s.name === "You") setShowOnboarding(true);
      refreshMomentum();
      if (prevMomentum && momentum) setDelta(momentum.score - (prevMomentum as any).score);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    if (!authLoading && user) loadAll();
  }, [authLoading, user]);

  const addHydration = async (amount: number) => {
    await addHydrationEntry({ id: Math.random().toString(36).slice(2), date: today(), timestamp: Date.now(), amount });
    await computeMomentum(today());
    loadAll();
  };

  const removeHydration = async (amount: number) => {
    const newVal = Math.max(0, hydration - amount);
    const { supabase } = await import("@/lib/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("hydration_entries").delete().eq("user_id", user.id).eq("date", today());
      if (newVal > 0) await addHydrationEntry({ id: Math.random().toString(36).slice(2), date: today(), timestamp: Date.now(), amount: newVal });
    }
    await computeMomentum(today());
    loadAll();
  };

  const refreshSteps = () => loadAll();

  const homeWidgets = settings?.homeWidgets ?? { streak: true, trendGraph: true, hydrationChart: true, sleepChart: true };
  const showStreak = homeWidgets.streak;

  if (authLoading || !ready) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = settings?.name && settings.name !== "You" ? settings.name.split(" ")[0] : "";

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => { setShowOnboarding(false); loadAll(); }} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>

        {/* Greeting header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <div>
            <p style={{ fontSize: "22px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>
              {greeting}{name ? `, ${name}` : ""} 👋
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600, marginTop: "2px" }}>
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          {showStreak && streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fef3c7", borderRadius: "16px", padding: "10px 14px", boxShadow: "0 2px 8px rgba(245,158,11,0.15)" }}>
              <span style={{ fontSize: "24px", filter: "drop-shadow(0 2px 4px rgba(245,158,11,0.4))" }}>🔥</span>
              <div>
                <p style={{ fontSize: "20px", fontWeight: 900, color: "#92400e", lineHeight: 1, letterSpacing: "-1px" }}>{streak}</p>
                <p style={{ fontSize: "8px", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.1em" }}>streak</p>
              </div>
            </div>
          )}
        </div>

        {/* Momentum card - stays dark */}
        {momentum && <ActivityRings breakdown={momentum.breakdown as any} score={momentum.score} ringsConfig={ringsConfig} onConfigChange={setRingsConfig} />}

        {/* Stat cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <StatCard
            emoji="💧" label="Hydration"
            value={`${(hydration/1000).toFixed(1)}`} unit="L"
            pct={hydration / hydrationGoal}
            color="linear-gradient(135deg, #6ee7f7, #3b82f6)"
            textColor="white"
            sub={`${Math.max(0, hydrationGoal - hydration)}ml left`}
          />
          <StatCard
            emoji="👟" label="Steps"
            value={steps.toLocaleString()} unit=""
            pct={steps / stepGoal}
            color="linear-gradient(135deg, #fde68a, #f59e0b)"
            textColor="#78350f"
            sub={`${Math.max(0, stepGoal - steps).toLocaleString()} to go`}
          />
          <StatCard
            emoji="🍽️" label="Calories"
            value={`${Math.max(0, (settings?.macroTargets?.calories || 2000) - caloriesToday)}`} unit=" left"
            pct={caloriesToday / (settings?.macroTargets?.calories || 2000)}
            color="linear-gradient(135deg, #86efac, #22c55e)"
            textColor="#14532d"
            sub={`${caloriesToday} eaten`}
          />
          <StatCard
            emoji="😴" label="Sleep"
            value={sleep ? sleep.duration.toFixed(1) : "—"} unit="h"
            pct={sleep ? sleep.duration / sleepGoal : 0}
            color="linear-gradient(135deg, #c4b5fd, #8b5cf6)"
            textColor="white"
            sub={`Goal: ${sleepGoal}h`}
          />
        </div>

        {/* Hydration card full */}
        <HydrationCard current={hydration} goal={hydrationGoal} onAdd={addHydration} onRemove={removeHydration} />

        {/* Sleep card */}
        <SleepCard sleep={sleep} goal={sleepGoal} onLog={() => setSleepModalOpen(true)} />

        {/* Steps card */}
        <StepsCard current={steps} goal={stepGoal} onUpdate={refreshSteps} />

        {/* Calorie budget */}
        <CalorieBudgetCard consumed={caloriesToday} goal={settings?.macroTargets?.calories || 2000} />

        {/* Body weight */}
        <BodyWeightCard />

        {/* Trend graph */}
        {homeWidgets.trendGraph && trend.length > 0 && (
          <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "14px" }}>7-Day Trend</p>
            <TrendGraph data={trend} />
          </div>
        )}

        {/* Hydration history */}
        {homeWidgets.hydrationChart && <HydrationHistory />}

        {/* Sleep history */}
        {homeWidgets.sleepChart && <SleepHistory />}

        {/* Share */}
        {momentum && <ShareCard score={momentum.score} breakdown={momentum.breakdown as any} name={settings?.name || "You"} />}

      </div>

      {sleepModalOpen && <SleepLogModal onClose={() => setSleepModalOpen(false)} onSave={() => { setSleepModalOpen(false); loadAll(); }} />}
    </>
  );
}

function StatCard({ emoji, label, value, unit, pct, color, textColor, sub }: {
  emoji: string; label: string; value: string; unit: string;
  pct: number; color: string; textColor: string; sub: string;
}) {
  const safePct = Math.min(Math.max(pct, 0), 1);
  return (
    <div className="btn-press" style={{ background: color, borderRadius: "24px", padding: "18px", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", overflow: "hidden", position: "relative" }}>
      <span style={{ fontSize: "22px", display: "block", marginBottom: "10px" }}>{emoji}</span>
      <div style={{ fontSize: "26px", fontWeight: 900, color: textColor, letterSpacing: "-1px", lineHeight: 1 }}>
        {value}<span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8 }}>{unit}</span>
      </div>
      <div style={{ fontSize: "9px", fontWeight: 700, color: textColor, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "5px" }}>{label}</div>
      <div style={{ height: "3px", background: "rgba(0,0,0,0.1)", borderRadius: "999px", marginTop: "10px", overflow: "hidden" }}>
        <div style={{ width: `${safePct * 100}%`, height: "100%", background: "rgba(0,0,0,0.2)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      <div style={{ fontSize: "9px", color: textColor, opacity: 0.55, fontWeight: 600, marginTop: "4px" }}>{sub}</div>
    </div>
  );
}