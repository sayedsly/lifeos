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
  const maxW = history.length > 0 ? Math.max(...history.map((e: any) => e.weight)) : 1;
  const minW = history.length > 0 ? Math.min(...history.map((e: any) => e.weight)) : 0;
  const range = maxW - minW || 1;

  return (
    <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "6px" }}>⚖️ Body Weight</p>
          {latest ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "36px", fontWeight: 900, color: "#111118", letterSpacing: "-2px", lineHeight: 1 }}>{latest.weight}</span>
              <span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 600 }}>lbs</span>
              {diff !== null && (
                <span style={{ fontSize: "12px", fontWeight: 700, color: diff < 0 ? "#22c55e" : diff > 0 ? "#ef4444" : "#9ca3af", background: diff < 0 ? "#dcfce7" : diff > 0 ? "#fee2e2" : "#f3f4f6", padding: "2px 8px", borderRadius: "6px" }}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                </span>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "15px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>No entries yet</p>
          )}
        </div>
        <button className="btn-press" onClick={() => setEditing(!editing)}
          style={{ background: editing ? "#111118" : "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 16px", fontSize: "12px", fontWeight: 700, color: editing ? "white" : "#374151", cursor: "pointer" }}>
          {editing ? "Cancel" : latest ? "Log" : "+ Add"}
        </button>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <input type="number" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. 175" autoFocus
            style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "16px", fontWeight: 700, color: "#111118", outline: "none", fontFamily: "inherit" }} />
          <button className="btn-press" onClick={handleSave} disabled={saving}
            style={{ padding: "12px 20px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            {saving ? "..." : "Save"}
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "44px" }}>
          {history.slice(-14).map((e: any, i: number, arr: any[]) => {
            const h = ((e.weight - minW) / range) * 100;
            const isLatest = i === arr.length - 1;
            return (
              <div key={e.id} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ width: "100%", height: `${Math.max(h, 8)}%`, borderRadius: "2px 2px 1px 1px", background: isLatest ? "#111118" : "#e5e7eb", transition: "height 0.5s ease" }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}