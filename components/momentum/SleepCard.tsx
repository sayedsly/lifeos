"use client";
import type { SleepEntry } from "@/types";

interface Props {
  sleep: SleepEntry | null;
  goal: number;
  onLog: () => void;
}

const qualityLabel = (q: number) => ["", "Poor", "Fair", "OK", "Good", "Great"][q] || "—";
const qualityColor = (q: number) => {
  if (q >= 4) return "text-emerald-400";
  if (q >= 3) return "text-zinc-400";
  return "text-red-400";
};

export default function SleepCard({ sleep, goal, onLog }: Props) {
  const pct = sleep ? Math.min((sleep.duration / goal) * 100, 100) : 0;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">Sleep</p>
        {sleep && (
          <p className={`text-[9px] font-semibold tracking-[0.15em] uppercase ${qualityColor(sleep.quality)}`}>
            {qualityLabel(sleep.quality)}
          </p>
        )}
      </div>

      {sleep ? (
        <>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-white leading-none">{sleep.duration}h</p>
            <p className="text-zinc-600 text-sm mb-0.5">/ {goal}h goal</p>
          </div>
          <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                pct >= 100 ? "bg-emerald-400" : pct >= 75 ? "bg-white" : "bg-red-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <button
          onClick={onLog}
          className="w-full py-3.5 rounded-2xl border border-zinc-800 text-zinc-500 text-[11px] tracking-[0.15em] uppercase hover:border-zinc-600 hover:text-zinc-400 active:scale-[0.98] transition-all duration-150"
        >
          Log Sleep
        </button>
      )}
    </div>
  );
}
