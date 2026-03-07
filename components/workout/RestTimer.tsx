"use client";
import { useEffect, useState, useRef } from "react";

interface Props {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
  onDurationChange?: (s: number) => void;
}

export default function RestTimer({ seconds, onComplete, onSkip, onDurationChange }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); onComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [seconds]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ background: "#111", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
      <div style={{ position: "relative", width: "64px", height: "64px", flexShrink: 0 }}>
        <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width="64" height="64">
          <circle cx="32" cy="32" r={r} stroke="#27272a" strokeWidth="3" fill="none" />
          <circle cx="32" cy="32" r={r} stroke="#a78bfa" strokeWidth="3" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "16px" }}>{remaining}</p>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: "#a1a1aa", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Rest</p>
        <div style={{ display: "flex", gap: "6px" }}>
          {[60, 90, 120, 180].map(s => (
            <button key={s} onClick={() => onDurationChange?.(s)} style={{
              padding: "4px 8px", borderRadius: "8px", border: "none", fontFamily: "inherit", fontSize: "10px", fontWeight: 700, cursor: "pointer",
              background: seconds === s ? "#7c3aed" : "#27272a", color: seconds === s ? "white" : "#71717a"
            }}>{s}s</button>
          ))}
        </div>
      </div>
      <button onClick={onSkip} style={{ padding: "8px 12px", borderRadius: "10px", background: "#27272a", border: "none", color: "#71717a", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Skip</button>
    </div>
  );
}
