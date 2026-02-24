"use client";
import type { NutritionEntry } from "@/types";
import { deleteNutritionEntry } from "@/lib/db/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props {
  entries: NutritionEntry[];
  onDelete: () => void;
}

export default function FoodLogList({ entries, onDelete }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
        <p className="text-zinc-600 text-xs tracking-widest uppercase text-center">No entries yet</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    await deleteNutritionEntry(id);
    await computeMomentum(format(new Date(), "yyyy-MM-dd"));
    onDelete();
  };

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center justify-between px-5 py-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium capitalize truncate">{e.food}</p>
            <p className="text-zinc-600 text-[10px] tracking-widest uppercase mt-0.5">{e.amount}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white text-sm font-semibold">{e.calories} kcal</p>
            <p className="text-zinc-600 text-[10px]">{e.protein}g protein</p>
          </div>
          <button
            onClick={() => handleDelete(e.id)}
            className="text-zinc-700 hover:text-red-400 transition-colors pl-2"
            aria-label="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
