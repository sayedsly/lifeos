"use client";
import { useEffect, useState, useRef } from "react";

interface Props {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ seconds, onComplete, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center gap-4">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Rest</p>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="96" height="96">
          <circle cx="48" cy="48" r="40" stroke="#27272a" strokeWidth="4" fill="none" />
          <circle
            cx="48" cy="48" r="40"
            stroke="white" strokeWidth="4" fill="none"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <p className="text-3xl font-bold text-white">{remaining}</p>
      </div>
      <button
        onClick={onSkip}
        className="px-6 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs tracking-widest uppercase"
      >
        Skip Rest
      </button>
    </div>
  );
}
