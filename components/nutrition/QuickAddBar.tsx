"use client";
import { useState, useRef, useEffect } from "react";
import { addNutritionEntry, getSettings, updateSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";
import type { MealCategory } from "@/types";

interface FoodResult {
  name: string; brand: string; serving: string; servingGrams: number;
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  vitA?: number; vitC?: number; vitD?: number; calcium?: number; iron?: number;
  source: string; barcode?: string;
}

interface Props { onAdd: () => void; defaultMeal?: MealCategory; }

const MEALS: { key: MealCategory; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
  { key: "supplement", label: "Supplement", emoji: "💊" },
];

export default function QuickAddBar({ onAdd, defaultMeal = "snack" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<MealCategory>(defaultMeal);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"search" | "manual" | "barcode">("search");
  const [editedMacros, setEditedMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [editingMacros, setEditingMacros] = useState(false);
  const [manual, setManual] = useState({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [recentFoods, setRecentFoods] = useState<Record<string, FoodResult[]>>({});
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const searchTimeout = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    getSettings().then(s => {
      if (s.recentFoods) setRecentFoods(s.recentFoods as any);
    }).catch(() => {});
  }, []);

  const saveRecentFood = async (food: FoodResult, mealKey: MealCategory) => {
    try {
      const settings = await getSettings();
      const existing = ((settings as any).recentFoods || {}) as Record<string, FoodResult[]>;
      const mealList = existing[mealKey] || [];
      const filtered = mealList.filter((f: FoodResult) => f.name !== food.name);
      const updated = [food, ...filtered].slice(0, 8);
      const newRecent = { ...existing, [mealKey]: updated };
      setRecentFoods(newRecent);
      await updateSettings({ ...settings, recentFoods: newRecent } as any);
    } catch (e) { console.error(e); }
  };

  const search = async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(\`/api/nutrition/search?q=\${encodeURIComponent(q)}\`);
      const data = await res.json();
      setResults(data.foods || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const lookupBarcode = async (barcode: string) => {
    setBarcodeLoading(true);
    try {
      const res = await fetch(\`https://world.openfoodfacts.org/api/v0/product/\${barcode}.json\`);
      const data = await res.json();
      if (data.status !== 1 || !data.product) throw new Error("Product not found");
      const p = data.product;
      const n = p.nutriments || {};
      const food: FoodResult = {
        name: p.product_name || "Unknown Product",
        brand: p.brands || "",
        serving: p.serving_size || "100g",
        servingGrams: parseFloat(p.serving_quantity) || 100,
        calories: Math.round(n["energy-kcal_serving"] || n["energy-kcal_100g"] || 0),
        protein: Math.round((n["proteins_serving"] || n["proteins_100g"] || 0) * 10) / 10,
        carbs: Math.round((n["carbohydrates_serving"] || n["carbohydrates_100g"] || 0) * 10) / 10,
        fat: Math.round((n["fat_serving"] || n["fat_100g"] || 0) * 10) / 10,
        fiber: Math.round((n["fiber_serving"] || n["fiber_100g"] || 0) * 10) / 10,
        vitA: n["vitamin-a_serving"] || undefined,
        vitC: n["vitamin-c_serving"] || undefined,
        calcium: n["calcium_serving"] || undefined,
        iron: n["iron_serving"] || undefined,
        source: "Open Food Facts",
        barcode,
      };
      selectFood(food);
      setScanning(false);
      stopCamera();
    } catch (e: any) {
      alert("Product not found. Try manual entry.");
    } finally { setBarcodeLoading(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);

      // Use BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"] });
        const scan = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              await lookupBarcode(barcodes[0].rawValue);
              return;
            }
          } catch {}
          setTimeout(scan, 300);
        };
        setTimeout(scan, 500);
      }
    } catch (e) {
      alert("Camera access denied. Enter barcode manually below.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
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
        amount: editingMacros ? "custom" : \`\${qty > 1 ? qty + "x " : ""}\${selected.serving}\`,
        meal, ...macros, source: "search",
        vitamins: selected.vitA || selected.vitC || selected.vitD || selected.calcium || selected.iron ? {
          vitA: selected.vitA, vitC: selected.vitC, vitD: selected.vitD,
          calcium: selected.calcium, iron: selected.iron,
        } : undefined,
      });
      await saveRecentFood(selected, meal);
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

  const quickAddRecent = async (food: FoodResult) => {
    setSaving(true);
    try {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: today, timestamp: Date.now(),
        food: food.name, amount: food.serving, meal,
        calories: food.calories, protein: food.protein,
        carbs: food.carbs, fat: food.fat, fiber: food.fiber,
        source: "search",
      });
      onAdd();
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "#27272a", border: "none", borderRadius: "10px", padding: "10px 12px", color: "white", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const macros = getScaledMacros();
  const mealRecent = recentFoods[meal] || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Meal selector */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "2px" }}>
        {MEALS.map(m => (
          <button key={m.key} onClick={() => setMeal(m.key)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "12px", border: meal === m.key ? "none" : "1px solid #27272a", cursor: "pointer", fontSize: "11px", fontWeight: 700, background: meal === m.key ? "white" : "#18181b", color: meal === m.key ? "black" : "#52525b" }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Recent foods for this meal */}
      {mealRecent.length > 0 && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Recent in {meal}</p>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {mealRecent.map((food, i) => (
              <button key={i} onClick={() => quickAddRecent(food)} disabled={saving}
                style={{ flexShrink: 0, padding: "8px 12px", borderRadius: "12px", border: "1px solid #27272a", background: "#18181b", cursor: "pointer", textAlign: "left" }}>
                <p style={{ color: "white", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>{food.name}</p>
                <p style={{ color: "#52525b", fontSize: "9px", marginTop: "2px" }}>{food.calories} kcal</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "4px" }}>
        {(["search", "barcode", "manual"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setSelected(null); setQuery(""); setResults([]); if (m !== "barcode") stopCamera(); }}
            style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: mode === m ? "white" : "transparent", color: mode === m ? "black" : "#52525b" }}>
            {m === "search" ? "🔍" : m === "barcode" ? "📷" : "✏️"} {m}
          </button>
        ))}
      </div>

      {/* Barcode mode */}
      {mode === "barcode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!scanning ? (
            <button onClick={startCamera}
              style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "#18181b", border: "1px solid #27272a", color: "white", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
              📷 Scan Barcode
            </button>
          ) : (
            <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#000" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "60%", height: "2px", background: "rgba(255,255,255,0.6)", boxShadow: "0 0 8px rgba(255,255,255,0.8)" }} />
              </div>
              <button onClick={stopCamera}
                style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px" }}>
                Stop
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input placeholder="Or type barcode number..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && barcodeInput.trim()) lookupBarcode(barcodeInput.trim()); }}
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => barcodeInput.trim() && lookupBarcode(barcodeInput.trim())} disabled={barcodeLoading}
              style={{ padding: "10px 16px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
              {barcodeLoading ? "..." : "Go"}
            </button>
          </div>
          <p style={{ color: "#3f3f46", fontSize: "10px", textAlign: "center" }}>Powered by Open Food Facts</p>
        </div>
      )}

      {/* Search mode */}
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
                      <p style={{ color: "#52525b", fontSize: "10px", marginTop: "2px" }}>{food.brand && \`\${food.brand} · \`}{food.serving}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>{food.calories} kcal</p>
                      <p style={{ color: "#52525b", fontSize: "10px" }}>{food.protein}g prot</p>
                    </div>
                  </div>
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
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }}
                  style={{ background: "none", border: "none", color: "#52525b", fontSize: "18px", cursor: "pointer" }}>×</button>
              </div>
              {!editingMacros && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>Servings ({selected.serving})</p>
                  <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="0.25" step="0.25"
                    style={{ ...inputStyle, width: "80px" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {(["calories", "protein", "carbs", "fat", "fiber"] as const).map(key => (
                  <div key={key} style={{ textAlign: "center", background: "#27272a", borderRadius: "10px", padding: "8px 4px" }}>
                    {editingMacros ? (
                      <input type="number" value={(editedMacros as any)[key]}
                        onChange={e => setEditedMacros(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: "100%", background: "none", border: "none", color: "white", fontSize: "14px", fontWeight: 700, textAlign: "center", outline: "none" }} />
                    ) : (
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{(macros as any)[key]}{key !== "calories" ? "g" : ""}</p>
                    )}
                    <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{key === "calories" ? "kcal" : key}</p>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => setEditingMacros(!editingMacros)}
                    style={{ background: "none", border: "1px solid #27272a", borderRadius: "8px", padding: "4px 8px", color: "#52525b", fontSize: "10px", cursor: "pointer" }}>
                    {editingMacros ? "Done" : "Edit"}
                  </button>
                </div>
              </div>
              {/* Vitamins if available */}
              {(selected.vitA || selected.vitC || selected.vitD || selected.calcium || selected.iron) && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                  {selected.vitA && <span style={{ fontSize: "10px", color: "#f59e0b", background: "#1c1400", borderRadius: "6px", padding: "3px 8px" }}>Vit A {selected.vitA}µg</span>}
                  {selected.vitC && <span style={{ fontSize: "10px", color: "#f97316", background: "#1c0a00", borderRadius: "6px", padding: "3px 8px" }}>Vit C {selected.vitC}mg</span>}
                  {selected.vitD && <span style={{ fontSize: "10px", color: "#facc15", background: "#1c1800", borderRadius: "6px", padding: "3px 8px" }}>Vit D {selected.vitD}µg</span>}
                  {selected.calcium && <span style={{ fontSize: "10px", color: "#a78bfa", background: "#13001c", borderRadius: "6px", padding: "3px 8px" }}>Ca {selected.calcium}mg</span>}
                  {selected.iron && <span style={{ fontSize: "10px", color: "#f87171", background: "#1c0000", borderRadius: "6px", padding: "3px 8px" }}>Iron {selected.iron}mg</span>}
                </div>
              )}
              <button onClick={saveSelected} disabled={saving}
                style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
                {saving ? "Adding..." : \`Add to \${meal.charAt(0).toUpperCase() + meal.slice(1)}\`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="Food name" value={manual.food} onChange={e => setManual(p => ({ ...p, food: e.target.value }))} style={{ ...inputStyle, padding: "12px 14px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {(["calories", "protein", "carbs", "fat", "fiber"] as const).map(key => (
              <div key={key}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{key}</p>
                <input type="number" placeholder="0" value={(manual as any)[key]} onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <button onClick={saveManual} disabled={saving || !manual.food.trim()}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: manual.food.trim() ? "white" : "#27272a", border: "none", color: manual.food.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            {saving ? "Adding..." : \`Add to \${meal.charAt(0).toUpperCase() + meal.slice(1)}\`}
          </button>
        </div>
      )}
    </div>
  );
}
