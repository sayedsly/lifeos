"use client";
import { useState } from "react";

interface Props { current: number; goal: number; onAdd: (ml: number) => void; onRemove: (ml: number) => void; }

const AMOUNTS = [200, 350, 500, 750];

export default function HydrationCard({ current, goal, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const pct = Math.min(current / goal, 1);

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>💧 Hydration</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#111118", letterSpacing: "-2px", lineHeight: 1 }}>{(current / 1000).toFixed(1)}</span>
            <span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 600 }}>/ {(goal / 1000).toFixed(1)}L</span>
          </div>
        </div>
        <button className="btn-press" onClick={() => setAdding(!adding)}
          style={{ background: adding ? "#111118" : "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 16px", fontSize: "12px", fontWeight: 700, color: adding ? "white" : "#374151", cursor: "pointer" }}>
          {adding ? "Done" : "+ Add"}
        </button>
      </div>

      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #6ee7f7, #3b82f6)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600 }}>{Math.max(0, goal - current)}ml remaining</p>

      {adding && (
        <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {AMOUNTS.map(ml => (
            <button key={ml} className="btn-press" onClick={() => onAdd(ml)}
              style={{ flex: 1, padding: "10px 8px", background: "linear-gradient(135deg, #e0f2fe, #bfdbfe)", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#1e40af", cursor: "pointer", minWidth: "60px" }}>
              {ml}ml
            </button>
          ))}
          <button className="btn-press" onClick={() => onRemove(200)}
            style={{ padding: "10px 14px", background: "#fef2f2", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}>
            −200
          </button>
        </div>
      )}
    </div>
  );
}