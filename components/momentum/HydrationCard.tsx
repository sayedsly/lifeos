"use client";

interface Props {
  current: number;
  goal: number;
}

export default function HydrationCard({ current, goal }: Props) {
  const pct = Math.min((current / goal) * 100, 100);
  const over = current >= goal;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">Hydration</p>
        <p className={`text-[9px] font-semibold tracking-[0.15em] uppercase ${over ? "text-emerald-400" : "text-zinc-600"}`}>
          {over ? "✓ Goal hit" : `${(goal - current).toLocaleString()}ml remaining`}
        </p>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-4xl font-bold text-white leading-none tabular-nums">{current.toLocaleString()}</p>
        <p className="text-zinc-600 text-sm mb-0.5">/ {goal.toLocaleString()}ml</p>
      </div>

      <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${over ? "bg-emerald-400" : "bg-blue-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-2">
        {[150, 250, 500].map((amt) => (
          <button
            key={amt}
            data-amount={amt}
            className="flex-1 py-2.5 rounded-2xl bg-zinc-800 text-zinc-400 text-[11px] font-semibold tracking-widest hover:bg-zinc-700 active:scale-95 transition-all duration-100"
          >
            +{amt}ml
          </button>
        ))}
      </div>
    </div>
  );
}
