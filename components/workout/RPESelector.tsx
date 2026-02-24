"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const rpeLabel = (v: number) => {
  if (v <= 3) return "Easy";
  if (v <= 5) return "Moderate";
  if (v <= 7) return "Hard";
  if (v <= 9) return "Very Hard";
  return "Max Effort";
};

export default function RPESelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Intensity (RPE)</p>
        <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
          {value}/10 — {rpeLabel(value)}
        </p>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full accent-white"
      />
      <div className="flex justify-between">
        <p className="text-[9px] text-zinc-700 uppercase tracking-widest">Easy</p>
        <p className="text-[9px] text-zinc-700 uppercase tracking-widest">Max</p>
      </div>
    </div>
  );
}
