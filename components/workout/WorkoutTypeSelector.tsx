"use client";
import { WORKOUT_TYPES } from "@/lib/constants/workouts";

interface Props {
  selected: string;
  onSelect: (type: string) => void;
}

export default function WorkoutTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Workout Type</p>
      <div className="flex flex-wrap gap-2">
        {WORKOUT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-widest transition-colors ${
              selected === type ? "bg-white text-black" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
