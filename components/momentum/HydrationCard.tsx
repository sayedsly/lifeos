"use client";
import { useState } from "react";

interface Props {
  current: number;
  goal: number;
  onAdd: (amount: number) => void;
  onRemove: (amount: number) => void;
}

export default function HydrationCard({ current, goal, onAdd, onRemove }: Props) {
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const pct = Math.min((current / goal) * 100, 100);
  const over = current >= goal;

  const handleCustomAdd = () => {
    const amt = parseInt(customAmount);
    if (amt > 0) { onAdd(amt); setCustomAmount(""); setShowCustom(false); }
  };

  const handleCustomRemove = () => {
    const amt = parseInt(customAmount);
    if (amt > 0) { onRemove(amt); setCustomAmount(""); setShowRemove(false); }
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Hydration</p>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: over ? "#34d399" : "#52525b" }}>
          {over ? "✓ Goal hit" : `${(goal - current).toLocaleString()}ml remaining`}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
        <p style={{ fontSize: "40px", fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{current.toLocaleString()}</p>
        <p style={{ color: "#52525b", fontSize: "14px", marginBottom: "4px" }}>/ {goal.toLocaleString()}ml</p>
      </div>

      <div style={{ height: "3px", background: "#27272a", borderRadius: "999px" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: over ? "#34d399" : "#3b82f6", transition: "width 500ms ease-out" }} />
      </div>

      {/* Quick add buttons */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[150, 250, 500].map(amt => (
          <button key={amt} onClick={() => onAdd(amt)}
            style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "#27272a", border: "none", color: "#a1a1aa", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer" }}>
            +{amt}ml
          </button>
        ))}
        <button onClick={() => { setShowCustom(!showCustom); setShowRemove(false); }}
          style={{ padding: "10px 14px", borderRadius: "12px", background: showCustom ? "white" : "#27272a", border: "none", color: showCustom ? "black" : "#a1a1aa", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
          Custom
        </button>
      </div>

      {/* Custom add */}
      {showCustom && (
        <div style={{ display: "flex", gap: "8px" }}>
          <input autoFocus type="number" placeholder="Enter ml..." value={customAmount} onChange={e => setCustomAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCustomAdd()}
            style={{ flex: 1, background: "#27272a", border: "none", borderRadius: "12px", padding: "10px 14px", color: "white", fontSize: "14px", outline: "none" }} />
          <button onClick={handleCustomAdd} style={{ padding: "10px 16px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>Add</button>
          <button onClick={() => { setShowCustom(false); setCustomAmount(""); }}
            style={{ padding: "10px 14px", borderRadius: "12px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "12px", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Remove section */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => { setShowRemove(!showRemove); setShowCustom(false); }}
          style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
          {showRemove ? "Cancel" : "− Remove"}
        </button>
      </div>

      {showRemove && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {[150, 250, 500].map(amt => (
              <button key={amt} onClick={() => { onRemove(amt); setShowRemove(false); }}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "#27272a", border: "none", color: "#f87171", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                -{amt}ml
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" placeholder="Custom ml..." value={customAmount} onChange={e => setCustomAmount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCustomRemove()}
              style={{ flex: 1, background: "#27272a", border: "none", borderRadius: "12px", padding: "10px 14px", color: "white", fontSize: "14px", outline: "none" }} />
            <button onClick={handleCustomRemove} style={{ padding: "10px 16px", borderRadius: "12px", background: "#ef4444", border: "none", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}
