"use client";
import type { FinanceGoal } from "@/types";

interface Props {
  goal: FinanceGoal;
  onAdd: (id: string, amount: number) => void;
}

export default function FinanceGoalCard({ goal, onAdd }: Props) {
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const remaining = goal.target - goal.current;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold text-base">{goal.name}</p>
          <p className="text-zinc-600 text-[10px] tracking-widest uppercase mt-0.5">
            {remaining > 0 ? `${goal.currency}${remaining.toLocaleString()} to go` : "Goal reached!"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-lg">{goal.currency}{goal.current.toLocaleString()}</p>
          <p className="text-zinc-600 text-xs">/ {goal.currency}{goal.target.toLocaleString()}</p>
        </div>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-emerald-400" : "bg-white"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-2">
        {[50, 100, 500].map(amt => (
          <button
            key={amt}
            onClick={() => onAdd(goal.id, amt)}
            className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold tracking-widest hover:bg-zinc-700 transition-colors"
          >
            +{amt}
          </button>
        ))}
      </div>
    </div>
  );
}
