"use client";

interface Props {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export default function MacroBar({ label, current, target, unit = "g" }: Props) {
  const pct = Math.min((current / target) * 100, 100);
  const over = current > target;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{label}</p>
        <p className="text-xs text-zinc-400">
          <span className={over ? "text-red-400" : "text-white"}>{Math.round(current)}</span>
          <span className="text-zinc-600">/{target}{unit}</span>
        </p>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-400" : "bg-white"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
