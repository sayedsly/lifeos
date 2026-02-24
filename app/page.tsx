"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import MomentumCard from "@/components/momentum/MomentumCard";
import HydrationCard from "@/components/momentum/HydrationCard";
import SleepCard from "@/components/momentum/SleepCard";
import StepsCard from "@/components/momentum/StepsCard";
import TrendGraph from "@/components/momentum/TrendGraph";
import SleepLogModal from "@/components/momentum/SleepLogModal";
import {
  getMomentumForDate,
  getHydrationForDate,
  getSleepForDate,
  getSettings,
  addHydrationEntry,
  getLast7DaysMomentum,
  getStepsForDate,
} from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import type { SleepEntry, MomentumSnapshot } from "@/types";
import { format, subDays } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function HomePage() {
  const { momentum, refreshMomentum, refreshSettings } = useLifeStore();
  const [delta, setDelta] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [hydrationGoal, setHydrationGoal] = useState(2500);
  const [sleep, setSleep] = useState<SleepEntry | null>(null);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [steps, setSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [trend, setTrend] = useState<MomentumSnapshot[]>([]);

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
      refreshSettings();
      refreshMomentum();
    } catch (e) {
      console.error("Load error:", e);
    }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!momentum) return;
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    getMomentumForDate(yesterday).then(prev => {
      setDelta(prev ? momentum.score - prev.score : 0);
    });
  }, [momentum]);

  const addHydration = async (amount: number) => {
    await addHydrationEntry({
      id: Math.random().toString(36).slice(2),
      date: today(),
      timestamp: Date.now(),
      amount,
    });
    await computeMomentum(today());
    const h = await getHydrationForDate(today());
    setHydration(h);
    refreshMomentum();
  };

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
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
      <StepsCard current={steps} goal={stepGoal} />

      {sleepModalOpen && (
        <SleepLogModal onClose={() => setSleepModalOpen(false)} onSave={loadAll} />
      )}
    </div>
  );
}
