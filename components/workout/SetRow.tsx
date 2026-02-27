"use client";
import type { WorkoutSet } from "@/types";

interface Props {
  set: WorkoutSet;
  index: number;
  onChange: (updated: WorkoutSet) => void;
  onComplete: () => void;
}

export default function SetRow({ set, index, onChange, onComplete }: Props) {
  return (
    <div className={`flex items-center gap-3 px-1 py-2 transition-opacity duration-200 ${set.completed ? "opacity-40" : ""}`}>
      <p className="text-zinc-600 text-xs w-4 text-center">{index + 1}</p>
      <input
        type="number"
        placeholder="lbs"
        value={set.weight || ""}
        onChange={e => onChange({ ...set, weight: parseFloat(e.target.value) || 0 })}
        className="flex-1 bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm text-center outline-none placeholder-zinc-700"
      />
      <p className="text-zinc-700 text-xs">×</p>
      <input
        type="number"
        placeholder="reps"
        value={set.reps || ""}
        onChange={e => onChange({ ...set, reps: parseInt(e.target.value) || 0 })}
        className="flex-1 bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm text-center outline-none placeholder-zinc-700"
      />
      <button
        onClick={onComplete}
        disabled={set.completed}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
          set.completed ? "bg-emerald-500" : "bg-zinc-800 hover:bg-zinc-700"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={set.completed ? "white" : "#52525b"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}
