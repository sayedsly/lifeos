"use client";

interface Props {
  current: number;
  goal: number;
}

export default function StepsCard({ current, goal }: Props) {
  const pct = Math.min((current / goal) * 100, 100);
  const over = current >= goal;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">Steps</p>
        <p className={`text-[9px] font-semibold tracking-[0.15em] uppercase ${over ? "text-emerald-400" : "text-zinc-600"}`}>
          {over ? "✓ Goal hit" : `${(goal - current).toLocaleString()} to go`}
        </p>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-4xl font-bold text-white leading-none tabular-nums">{current.toLocaleString()}</p>
        <p className="text-zinc-600 text-sm mb-0.5">/ {goal.toLocaleString()}</p>
      </div>

      <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${over ? "bg-emerald-400" : "bg-white"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
