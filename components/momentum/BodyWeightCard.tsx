"use client";
import { useState, useEffect } from "react";
import { getBodyWeightHistory, logBodyWeight } from "@/lib/supabase/queries";

export default function BodyWeightCard() {
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await getBodyWeightHistory(30);
    setHistory(data);
    if (data.length > 0) setInput(String(data[data.length - 1].weight));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const w = parseFloat(input);
    if (!w) return;
    setSaving(true);
    await logBodyWeight(w);
    await load();
    setSaving(false);
    setEditing(false);
  };

  const latest = history[history.length - 1];
  const first = history[0];
  const diff = latest && first && history.length > 1 ? (latest.weight - first.weight) : null;
  const maxW = history.length > 0 ? Math.max(...history.map(e => e.weight)) : 1;
  const minW = history.length > 0 ? Math.min(...history.map(e => e.weight)) : 0;
  const range = maxW - minW || 1;

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Body Weight</p>
          {latest ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <p style={{ fontSize: "36px", fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>{latest.weight}</p>
              <p style={{ fontSize: "13px", color: "#52525b" }}>lbs</p>
              {diff !== null && (
                <p style={{ fontSize: "12px", color: diff < 0 ? "#34d399" : diff > 0 ? "#f87171" : "#52525b", fontWeight: 600 }}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: "#52525b", marginTop: "8px" }}>No entries yet</p>
          )}
        </div>
        <button onClick={() => setEditing(!editing)}
          style={{ padding: "8px 16px", borderRadius: "10px", background: "#27272a", border: "none", color: "white", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
          {editing ? "Cancel" : latest ? "Log" : "+ Add"}
        </button>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="number" value={input} onChange={e => setInput(e.target.value)}
            placeholder="e.g. 175" autoFocus
            style={{ flex: 1, background: "#27272a", border: "1px solid #3f3f46", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "16px", fontWeight: 700, outline: "none" }} />
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "12px 20px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            {saving ? "..." : "Save"}
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "48px" }}>
          {history.slice(-14).map((e, i, arr) => {
            const h = ((e.weight - minW) / range) * 100;
            const isLatest = i === arr.length - 1;
            return (
              <div key={e.id} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ width: "100%", height: `${Math.max(h, 8)}%`, borderRadius: "2px 2px 1px 1px", background: isLatest ? "white" : "#3f3f46" }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
