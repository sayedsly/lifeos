"use client";
import { useState, useRef, useEffect } from "react";
import { addNutritionEntry } from "@/lib/supabase/queries";
import { format } from "date-fns";

interface FoodResult {
  name: string;
  brand: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface Props {
  onAdd: () => void;
}

export default function QuickAddBar({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [manual, setManual] = useState({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const searchTimeout = useRef<any>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const search = async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.foods || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(val), 500);
  };

  const selectFood = (food: FoodResult) => {
    setSelected(food);
    setResults([]);
    setQuery(food.name);
    setServings("1");
  };

  const saveSelected = async () => {
    if (!selected) return;
    setSaving(true);
    const qty = parseFloat(servings) || 1;
    try {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: today,
        timestamp: Date.now(),
        food: selected.name,
        amount: `${qty > 1 ? qty + "x " : ""}${selected.serving}`,
        calories: Math.round(selected.calories * qty),
        protein: Math.round(selected.protein * qty * 10) / 10,
        carbs: Math.round(selected.carbs * qty * 10) / 10,
        fat: Math.round(selected.fat * qty * 10) / 10,
        fiber: Math.round(selected.fiber * qty * 10) / 10,
        source: "voice",
      });
      setSelected(null);
      setQuery("");
      setServings("1");
      onAdd();
    } finally { setSaving(false); }
  };

  const saveManual = async () => {
    if (!manual.food.trim()) return;
    setSaving(true);
    try {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: today,
        timestamp: Date.now(),
        food: manual.food,
        amount: "custom",
        calories: parseFloat(manual.calories) || 0,
        protein: parseFloat(manual.protein) || 0,
        carbs: parseFloat(manual.carbs) || 0,
        fat: parseFloat(manual.fat) || 0,
        fiber: parseFloat(manual.fiber) || 0,
        source: "voice",
      });
      setManual({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
      onAdd();
    } finally { setSaving(false); }
  };

  const inputStyle = {
    background: "#27272a", border: "none", borderRadius: "10px",
    padding: "10px 12px", color: "white", fontSize: "14px", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "4px" }}>
        {(["search", "manual"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setSelected(null); setQuery(""); setResults([]); }}
            style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: mode === m ? "white" : "transparent", color: mode === m ? "black" : "#52525b" }}>
            {m === "search" ? "🔍 Search" : "✏️ Manual"}
          </button>
        ))}
      </div>

      {mode === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            placeholder="Search food (e.g. chicken breast, banana...)"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            style={{ ...inputStyle, padding: "14px 16px", borderRadius: "14px", fontSize: "15px" }}
          />

          {loading && (
            <p style={{ color: "#52525b", fontSize: "11px", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>Searching...</p>
          )}

          {results.length > 0 && !selected && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", overflow: "hidden" }}>
              {results.map((food, i) => (
                <button key={i} onClick={() => selectFood(food)}
                  style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", borderBottom: i < results.length - 1 ? "1px solid #27272a" : "none", cursor: "pointer" }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{food.name}</p>
                  <p style={{ color: "#52525b", fontSize: "11px" }}>
                    {food.brand && `${food.brand} · `}{food.serving} · {food.calories} kcal · {food.protein}g protein
                  </p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: "12px" }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>{selected.name}</p>
                  <p style={{ color: "#52525b", fontSize: "11px" }}>{selected.serving} per serving</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }}
                  style={{ background: "none", border: "none", color: "#52525b", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>Servings</p>
                <input
                  type="number"
                  value={servings}
                  onChange={e => setServings(e.target.value)}
                  min="0.5"
                  step="0.5"
                  style={{ ...inputStyle, width: "80px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Cal", value: Math.round(selected.calories * (parseFloat(servings) || 1)) },
                  { label: "Protein", value: Math.round(selected.protein * (parseFloat(servings) || 1)) + "g" },
                  { label: "Carbs", value: Math.round(selected.carbs * (parseFloat(servings) || 1)) + "g" },
                  { label: "Fat", value: Math.round(selected.fat * (parseFloat(servings) || 1)) + "g" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center", background: "#27272a", borderRadius: "10px", padding: "8px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{value}</p>
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                  </div>
                ))}
              </div>

              <button onClick={saveSelected} disabled={saving}
                style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                {saving ? "Adding..." : "Add to Log"}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="Food name" value={manual.food} onChange={e => setManual(p => ({ ...p, food: e.target.value }))} style={{ ...inputStyle, padding: "12px 14px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "Calories", key: "calories" },
              { label: "Protein (g)", key: "protein" },
              { label: "Carbs (g)", key: "carbs" },
              { label: "Fat (g)", key: "fat" },
            ].map(({ label, key }) => (
              <div key={key}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</p>
                <input type="number" placeholder="0" value={(manual as any)[key]} onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <button onClick={saveManual} disabled={saving || !manual.food.trim()}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: manual.food.trim() ? "white" : "#27272a", border: "none", color: manual.food.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {saving ? "Adding..." : "Add to Log"}
          </button>
        </div>
      )}
    </div>
  );
}
