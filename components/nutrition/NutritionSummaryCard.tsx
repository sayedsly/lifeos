"use client";
import type { MacroTargets } from "@/types";
import MacroBar from "./MacroBar";

interface Props {
  totals: MacroTargets;
  targets: MacroTargets;
}

export default function NutritionSummaryCard({ totals, targets }: Props) {
  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">Calories</p>
          <p className="text-5xl font-bold text-white leading-none">{Math.round(totals.calories)}</p>
        </div>
        <p className="text-zinc-600 text-sm">/ {targets.calories} kcal</p>
      </div>
      <div className="space-y-3">
        <MacroBar label="Protein" current={totals.protein} target={targets.protein} />
        <MacroBar label="Carbs" current={totals.carbs} target={targets.carbs} />
        <MacroBar label="Fat" current={totals.fat} target={targets.fat} />
        <MacroBar label="Fiber" current={totals.fiber} target={targets.fiber} />
      </div>
    </div>
  );
}
