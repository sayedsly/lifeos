"use client";
import { useState } from "react";
import type { NutritionEntry } from "@/types";
import { addNutritionEntry } from "@/lib/db/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props {
  onAdd: () => void;
}

export default function QuickAddBar({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [food, setFood] = useState("");
  const [cals, setCals] = useState("");
  const [protein, setProtein] = useState("");

  const submit = async () => {
    if (!food || !cals) return;
    const entry: NutritionEntry = {
      id: Math.random().toString(36).slice(2),
      date: format(new Date(), "yyyy-MM-dd"),
      timestamp: Date.now(),
      food,
      amount: "custom",
      calories: parseFloat(cals),
      protein: parseFloat(protein) || 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      source: "manual",
    };
    await addNutritionEntry(entry);
    await computeMomentum(format(new Date(), "yyyy-MM-dd"));
    setFood(""); setCals(""); setProtein(""); setOpen(false);
    onAdd();
  };

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Quick Add</p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2">
          {open ? <line x1="18" y1="6" x2="6" y2="18" /> : <line x1="12" y1="5" x2="12" y2="19" />}
          {open ? <line x1="6" y1="6" x2="18" y2="18" /> : <line x1="5" y1="12" x2="19" y2="12" />}
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-zinc-800">
          <input
            placeholder="Food name"
            value={food}
            onChange={e => setFood(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none mt-3"
          />
          <div className="flex gap-3">
            <input
              placeholder="Calories"
              type="number"
              value={cals}
              onChange={e => setCals(e.target.value)}
              className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none"
            />
            <input
              placeholder="Protein (g)"
              type="number"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none"
            />
          </div>
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl bg-white text-black text-xs font-semibold tracking-widest uppercase"
          >
            Log Entry
          </button>
        </div>
      )}
    </div>
  );
}
