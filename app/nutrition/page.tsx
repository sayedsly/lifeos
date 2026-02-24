"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import NutritionSummaryCard from "@/components/nutrition/NutritionSummaryCard";
import FoodLogList from "@/components/nutrition/FoodLogList";
import QuickAddBar from "@/components/nutrition/QuickAddBar";
import {
  getNutritionForDate,
  getNutritionTotals,
  getSettings,
  deleteNutritionEntry,
} from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import type { MacroTargets, NutritionEntry } from "@/types";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function NutritionPage() {
  const { refreshMomentum } = useLifeStore();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [totals, setTotals] = useState<MacroTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [targets, setTargets] = useState<MacroTargets>({ calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 });

  const refresh = async () => {
    const [e, t, s] = await Promise.all([
      getNutritionForDate(today()),
      getNutritionTotals(today()),
      getSettings(),
    ]);
    setEntries(e);
    setTotals(t);
    setTargets(s.macroTargets);
    await computeMomentum(today());
    refreshMomentum();
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string) => {
    await deleteNutritionEntry(id);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Nutrition</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>
      <NutritionSummaryCard totals={totals} targets={targets} />
      <QuickAddBar onAdd={refresh} />
      <div>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "12px" }}>
          Today's Log
        </p>
        <FoodLogList entries={entries} onDelete={handleDelete} />
      </div>
    </div>
  );
}
