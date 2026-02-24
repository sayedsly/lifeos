"use client";
import { useState } from "react";
import { upsertSleep } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function SleepLogModal({ onClose, onSave }: Props) {
  const [duration, setDuration] = useState("7");
  const [quality, setQuality] = useState(3);

  const save = async () => {
    await upsertSleep({
      id: `sleep-${format(new Date(), "yyyy-MM-dd")}`,
      date: format(new Date(), "yyyy-MM-dd"),
      timestamp: Date.now(),
      duration: parseFloat(duration),
      quality,
    });
    await computeMomentum(format(new Date(), "yyyy-MM-dd"));
    onSave();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "448px", background: "#18181b", border: "1px solid #27272a", borderRadius: "24px 24px 0 0", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Log Sleep</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancel</button>
        </div>
        <div>
          <p style={{ fontSize: "10px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>Hours slept</p>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            step="0.5" min="0" max="24"
            style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "16px", padding: "16px 20px", color: "white", fontSize: "28px", fontWeight: 700, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <p style={{ fontSize: "10px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Quality</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[1, 2, 3, 4, 5].map(q => (
              <button key={q} onClick={() => setQuality(q)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer", border: "none", background: quality === q ? "white" : "#27272a", color: quality === q ? "black" : "#71717a" }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", padding: "0 2px" }}>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Poor</p>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Great</p>
          </div>
        </div>
        <button onClick={save}
          style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
          Save Sleep
        </button>
      </div>
    </div>
  );
}
