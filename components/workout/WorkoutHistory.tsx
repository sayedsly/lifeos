"use client";
import type { WorkoutSession } from "@/types";

interface Props {
  sessions: WorkoutSession[];
}

export default function WorkoutHistory({ sessions }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Recent Sessions</p>
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
        {sessions.slice(0, 5).map(s => {
          const totalVolume = s.exercises.reduce((sum, e) =>
            sum + e.sets.reduce((s2, set) => s2 + (set.weight || 0) * (set.reps || 0), 0), 0);
          return (
            <div key={s.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold">{s.type}</p>
                <p className="text-zinc-600 text-[10px] tracking-widest uppercase mt-0.5">
                  {s.date} · {s.duration}min · RPE {s.intensity}
                </p>
              </div>
              {totalVolume > 0 && (
                <p className="text-zinc-400 text-xs">{totalVolume.toLocaleString()}kg</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
