"use client";
import { useState, useRef } from "react";
import { addNutritionEntry } from "@/lib/supabase/queries";
import { format } from "date-fns";
import type { MealCategory } from "@/types";

interface FoodResult {
  name: string;
  brand: string;
  serving: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: string;
}

interface Props { onAdd: () => void; defaultMeal?: MealCategory; }

const MEALS: { key: MealCategory; label: string }[] = [
  { key: "breakfast", label: "🌅 Breakfast" },
  { key: "lunch", label: "☀️ Lunch" },
  { key: "dinner", label: "🌙 Dinner" },
  { key: "snack", label: "🍎 Snack" },
  { key: "supplement", label: "💊 Supplement" },
];

export default function QuickAddBar({ onAdd, defaultMeal = "snack" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<MealCategory>(defaultMeal);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [editedMacros, setEditedMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [editingMacros, setEditingMacros] = useState(false);
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
    setEditedMacros({ calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber });
    setEditingMacros(false);
  };

  const getScaledMacros = () => {
    const qty = parseFloat(servings) || 1;
    if (editingMacros) return editedMacros;
    if (!selected) return editedMacros;
    return {
      calories: Math.round(selected.calories * qty),
      protein: Math.round(selected.protein * qty * 10) / 10,
      carbs: Math.round(selected.carbs * qty * 10) / 10,
      fat: Math.round(selected.fat * qty * 10) / 10,
      fiber: Math.round(selected.fiber * qty * 10) / 10,
    };
  };

  const saveSelected = async () => {
    if (!selected) return;
    setSaving(true);
    const qty = parseFloat(servings) || 1;
    const macros = getScaledMacros();
    try {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: today, timestamp: Date.now(),
        food: selected.name,
        amount: editingMacros ? "custom" : `${qty > 1 ? qty + "x " : ""}${selected.serving}`,
        meal,
        ...macros,
        source: "search",
      });
      setSelected(null); setQuery(""); setServings("1"); setEditingMacros(false);
      onAdd();
    } finally { setSaving(false); }
  };

  const saveManual = async () => {
    if (!manual.food.trim()) return;
    setSaving(true);
    try {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: today, timestamp: Date.now(),
        food: manual.food, amount: "custom", meal,
        calories: parseFloat(manual.calories) || 0,
        protein: parseFloat(manual.protein) || 0,
        carbs: parseFloat(manual.carbs) || 0,
        fat: parseFloat(manual.fat) || 0,
        fiber: parseFloat(manual.fiber) || 0,
        source: "manual",
      });
      setManual({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
      onAdd();
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "#27272a", border: "none", borderRadius: "10px", padding: "10px 12px", color: "white", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const macros = getScaledMacros();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Meal selector */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "2px" }}>
        {MEALS.map(m => (
          <button key={m.key} onClick={() => setMeal(m.key)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "12px", border: meal === m.key ? "none" : "1px solid #27272a", cursor: "pointer", fontSize: "11px", fontWeight: 700, background: meal === m.key ? "white" : "#18181b", color: meal === m.key ? "black" : "#52525b" }}>
            {m.label}
          </button>
        ))}
      </div>

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
          <input placeholder="Search any food..." value={query} onChange={e => handleQueryChange(e.target.value)}
            style={{ ...inputStyle, padding: "14px 16px", borderRadius: "14px", fontSize: "15px" }} />

          {loading && <p style={{ color: "#52525b", fontSize: "11px", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>Searching...</p>}

          {results.length > 0 && !selected && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", overflow: "hidden" }}>
              {results.map((food, i) => (
                <button key={i} onClick={() => selectFood(food)}
                  style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", borderBottom: i < results.length - 1 ? "1px solid #27272a" : "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, marginRight: "8px" }}>
                      <p style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{food.name}</p>
                      <p style={{ color: "#52525b", fontSize: "10px", marginTop: "2px" }}>
                        {food.brand && `${food.brand} · `}{food.serving}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>{food.calories} kcal</p>
                      <p style={{ color: "#52525b", fontSize: "10px" }}>{food.protein}g prot</p>
                    </div>
                  </div>
                  <p style={{ color: "#3f3f46", fontSize: "9px", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{food.source}</p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: "12px" }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>{selected.name}</p>
                  {selected.brand && <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>{selected.brand}</p>}
                  <p style={{ color: "#3f3f46", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{selected.source}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }}
                  style={{ background: "none", border: "none", color: "#52525b", fontSize: "18px", cursor: "pointer" }}>×</button>
              </div>

              {/* Servings */}
              {!editingMacros && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>Servings ({selected.serving})</p>
                  <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="0.25" step="0.25"
                    style={{ ...inputStyle, width: "80px" }} />
                </div>
              )}

              {/* Macros display + edit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {[
                  { label: "Cal", key: "calories", unit: "" },
                  { label: "Protein", key: "protein", unit: "g" },
                  { label: "Carbs", key: "carbs", unit: "g" },
                  { label: "Fat", key: "fat", unit: "g" },
                  { label: "Fiber", key: "fiber", unit: "g" },
                ].map(({ label, key, unit }) => (
                  <div key={key} style={{ textAlign: "center", background: "#27272a", borderRadius: "10px", padding: "8px 4px" }}>
                    {editingMacros ? (
                      <input type="number" value={(editedMacros as any)[key]}
                        onChange={e => setEditedMacros(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: "100%", background: "none", border: "none", color: "white", fontSize: "14px", fontWeight: 700, textAlign: "center", outline: "none" }} />
                    ) : (
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{(macros as any)[key]}{unit}</p>
                    )}
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{label}</p>
                  </div>
                ))}
                <div style={{ textAlign: "center", background: "none", borderRadius: "10px", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => setEditingMacros(!editingMacros)}
                    style={{ background: "none", border: "1px solid #27272a", borderRadius: "8px", padding: "4px 8px", color: "#52525b", fontSize: "10px", cursor: "pointer" }}>
                    {editingMacros ? "Done" : "Edit"}
                  </button>
                </div>
              </div>

              <button onClick={saveSelected} disabled={saving}
                style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                {saving ? "Adding..." : `Add to ${meal.charAt(0).toUpperCase() + meal.slice(1)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="Food name" value={manual.food} onChange={e => setManual(p => ({ ...p, food: e.target.value }))} style={{ ...inputStyle, padding: "12px 14px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "Calories", key: "calories" },
              { label: "Protein (g)", key: "protein" },
              { label: "Carbs (g)", key: "carbs" },
              { label: "Fat (g)", key: "fat" },
              { label: "Fiber (g)", key: "fiber" },
            ].map(({ label, key }) => (
              <div key={key}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</p>
                <input type="number" placeholder="0" value={(manual as any)[key]} onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <button onClick={saveManual} disabled={saving || !manual.food.trim()}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: manual.food.trim() ? "white" : "#27272a", border: "none", color: manual.food.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {saving ? "Adding..." : `Add to ${meal.charAt(0).toUpperCase() + meal.slice(1)}`}
          </button>
        </div>
      )}
    </div>
  );
}
