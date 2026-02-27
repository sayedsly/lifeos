"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useAuthStore } from "@/store/useAuthStore";
import MomentumCard from "@/components/momentum/MomentumCard";
import HydrationCard from "@/components/momentum/HydrationCard";
import SleepCard from "@/components/momentum/SleepCard";
import StepsCard from "@/components/momentum/StepsCard";
import TrendGraph from "@/components/momentum/TrendGraph";
import SleepLogModal from "@/components/momentum/SleepLogModal";
import Onboarding from "@/components/Onboarding";
import {
  getMomentumForDate, getHydrationForDate, getSleepForDate,
  getSettings, addHydrationEntry, getLast7DaysMomentum, getStepsForDate,
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
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadAll = async () => {
    try {
      const [s, h, sl, stepCount, trendData] = await Promise.all([
        getSettings(),
        getHydrationForDate(today()),
        getSleepForDate(today()),
        getStepsForDate(today()),
        getLast7DaysMomentum(),
      ]);
      setHydrationGoal(s.hydrationGoal);
      setSleepGoal(s.sleepGoal);
      setStepGoal(s.stepGoal);
      setHydration(h);
      setSleep(sl || null);
      setSteps(stepCount);
      setTrend(trendData);
      refreshMomentum();
      // Show onboarding if name is still default
      if (!s.name || s.name === "You") setShowOnboarding(true);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setReady(true);
    }
  };

  const refreshSteps = async () => {
    const s = await getStepsForDate(today());
    setSteps(s);
    refreshMomentum();
  };

  useEffect(() => {
    if (!authLoading && user) loadAll();
    if (!authLoading && !user) window.location.href = "/auth";
  }, [user, authLoading]);

  useEffect(() => {
    if (!momentum) return;
    getMomentumForDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))
      .then(prev => setDelta(prev ? momentum.score - prev.score : 0))
      .catch(() => {});
  }, [momentum]);

  const addHydration = async (amount: number) => {
    try {
      await addHydrationEntry({ id: Math.random().toString(36).slice(2), date: today(), timestamp: Date.now(), amount });
      await computeMomentum(today());
      const h = await getHydrationForDate(today());
      setHydration(h);
      refreshMomentum();
    } catch (e) { console.error(e); }
  };

  if (authLoading || !ready) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  if (showOnboarding) return (
    <Onboarding onComplete={() => { setShowOnboarding(false); loadAll(); }} />
  );

  return (
    <div className="space-y-4">
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>LifeOS</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>
      <MomentumCard snapshot={momentum} delta={delta} />
      <TrendGraph data={trend} />
      <div onClick={async (e) => {
        const btn = (e.target as HTMLElement).closest("button[data-amount]");
        if (btn) {
          const amount = parseInt(btn.getAttribute("data-amount") || "0");
          if (amount) await addHydration(amount);
        }
      }}>
        <HydrationCard current={hydration} goal={hydrationGoal} />
      </div>
      <SleepCard sleep={sleep} goal={sleepGoal} onLog={() => setSleepModalOpen(true)} />
      <StepsCard current={steps} goal={stepGoal} onUpdate={refreshSteps} />
      {sleepModalOpen && <SleepLogModal onClose={() => setSleepModalOpen(false)} onSave={loadAll} />}
    </div>
  );
}
