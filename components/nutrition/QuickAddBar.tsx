"use client";
import { useState, useRef, useEffect } from "react";
import { addNutritionEntry, getSettings, updateSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";
import type { MealCategory } from "@/types";

interface FoodResult {
  name: string; brand: string; serving: string; servingGrams: number;
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  vitA?: number; vitC?: number; vitD?: number; calcium?: number; iron?: number;
  source: string;
}

interface Props { onAdd: () => void; defaultMeal?: MealCategory; }

const MEALS: { key: MealCategory; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
  { key: "supplement", label: "Supplement", emoji: "💊" },
];

const VITAMIN_FIELDS = [
  { key: "vitA", label: "Vit A (mcg)", color: "#f59e0b", bg: "#fef3c7" },
  { key: "vitC", label: "Vit C (mg)", color: "#f97316", bg: "#fff7ed" },
  { key: "vitD", label: "Vit D (mcg)", color: "#eab308", bg: "#fefce8" },
  { key: "calcium", label: "Calcium (mg)", color: "#8b5cf6", bg: "#f3e8ff" },
  { key: "iron", label: "Iron (mg)", color: "#ef4444", bg: "#fee2e2" },
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
  const [manual, setManual] = useState({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", vitA: "", vitC: "", vitD: "", calcium: "", iron: "" });
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
      if ((s as any).recentFoods) setRecentFoods((s as any).recentFoods);
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
      const res = await fetch("/api/nutrition/search?q=" + encodeURIComponent(q));
      const data = await res.json();
      setResults(data.foods || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const lookupBarcode = async (barcode: string) => {
    setBarcodeLoading(true);
    try {
      const urls = [
        "https://world.openfoodfacts.org/api/v0/product/" + barcode + ".json",
        "https://world.openfoodfacts.org/api/v0/product/" + barcode.replace(/^0+/, "") + ".json",
      ];
      let data: any = null;
      for (const url of urls) {
        const res = await fetch(url);
        const d = await res.json();
        if (d.status === 1 && d.product?.product_name) { data = d; break; }
      }
      if (!data) throw new Error("Not found");
      const p = data.product;
      const n = p.nutriments || {};
      selectFood({
        name: p.product_name || "Unknown",
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
      });
      setScanning(false);
      stopCamera();
    } catch { alert("Product not found. Try manual entry."); }
    finally { setBarcodeLoading(false); }
  };

  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
      streamRef.current = stream;
      setScanning(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      }, 100);
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        const scan = async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) { await lookupBarcode(barcodes[0].rawValue); return; }
          } catch {}
          setTimeout(scan, 400);
        };
        setTimeout(scan, 500);
      }
    } catch { alert("Camera access denied. Enter barcode manually below."); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(val), 200);
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
        amount: editingMacros ? "custom" : (qty > 1 ? qty + "x " : "") + selected.serving,
        meal, ...macros, source: "search",
        vitamins: (selected.vitA || selected.vitC || selected.calcium || selected.iron) ? {
          vitA: selected.vitA, vitC: selected.vitC, calcium: selected.calcium, iron: selected.iron,
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
      const hasVitamins = manual.vitA || manual.vitC || manual.vitD || manual.calcium || manual.iron;
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
        vitamins: hasVitamins ? {
          vitA: parseFloat(manual.vitA) || undefined,
          vitC: parseFloat(manual.vitC) || undefined,
          vitD: parseFloat(manual.vitD) || undefined,
          calcium: parseFloat(manual.calcium) || undefined,
          iron: parseFloat(manual.iron) || undefined,
        } : undefined,
      });
      setManual({ food: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", vitA: "", vitC: "", vitD: "", calcium: "", iron: "" });
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

  const macros = getScaledMacros();
  const mealRecent = recentFoods[meal] || [];

  const inputStyle = {
    background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px",
    padding: "11px 14px", color: "#111118", fontSize: "14px", fontWeight: 600,
    outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Meal selector */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "2px" }}>
        {MEALS.map(m => (
          <button key={m.key} onClick={() => setMeal(m.key)}
            style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, fontFamily: "inherit",
              background: meal === m.key ? "#111118" : "white",
              color: meal === m.key ? "white" : "#6b7280",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "all 0.15s",
            }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Recent foods */}
      {mealRecent.length > 0 && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", color: "#9ca3af", textTransform: "uppercase" }}>Recent in {meal}</p>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "2px" }}>
            {mealRecent.map((food, i) => (
              <button key={i} onClick={() => quickAddRecent(food)} disabled={saving}
                style={{ flexShrink: 0, padding: "10px 14px", borderRadius: "14px", border: "none", background: "white", cursor: "pointer", textAlign: "left" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <p style={{ color: "#111118", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{food.name}</p>
                <p style={{ color: "#9ca3af", fontSize: "10px", marginTop: "2px", fontWeight: 600 }}>{food.calories} kcal · tap to add</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["search", "barcode", "manual"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setSelected(null); setQuery(""); setResults([]); if (m !== "barcode") stopCamera(); }}
            style={{ flex: 1, padding: "9px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, fontFamily: "inherit",
              background: mode === m ? "#111118" : "transparent",
              color: mode === m ? "white" : "#9ca3af",
              transition: "all 0.15s",
            }}>
            {m === "search" ? "🔍 Search" : m === "barcode" ? "📷 Scan" : "✏️ Manual"}
          </button>
        ))}
      </div>

      {/* Barcode mode */}
      {mode === "barcode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!scanning ? (
            <button onClick={startCamera}
              style={{ width: "100%", padding: "20px", borderRadius: "18px", background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", border: "none", color: "#3730a3", fontWeight: 800, fontSize: "15px", cursor: "pointer", fontFamily: "inherit" }}>
              📷 Open Camera to Scan
            </button>
          ) : (
            <div style={{ position: "relative", borderRadius: "18px", overflow: "hidden", background: "#000" }}>
              <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => videoRef.current?.play()} style={{ width: "100%", height: "220px", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "65%", height: "2px", background: "rgba(255,255,255,0.8)", boxShadow: "0 0 10px rgba(255,255,255,0.9)" }} />
              </div>
              <button onClick={stopCamera}
                style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                Stop
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input placeholder="Or type barcode number..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && barcodeInput.trim()) lookupBarcode(barcodeInput.trim()); }}
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => barcodeInput.trim() && lookupBarcode(barcodeInput.trim())} disabled={barcodeLoading}
              style={{ padding: "11px 18px", borderRadius: "12px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              {barcodeLoading ? "..." : "Go"}
            </button>
          </div>
          <p style={{ color: "#9ca3af", fontSize: "10px", textAlign: "center", fontWeight: 600 }}>Powered by Open Food Facts</p>
        </div>
      )}

      {/* Search mode */}
      {mode === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input placeholder="Search any food..." value={query} onChange={e => handleQueryChange(e.target.value)} style={{ ...inputStyle, padding: "14px 16px", fontSize: "15px" }} />
          {loading && <p style={{ color: "#9ca3af", fontSize: "11px", textAlign: "center", fontWeight: 600 }}>Searching...</p>}
          {results.length > 0 && !selected && (
            <div style={{ background: "white", borderRadius: "18px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              {results.map((food, i) => (
                <button key={i} onClick={() => selectFood(food)}
                  style={{ width: "100%", textAlign: "left" as const, padding: "13px 16px", background: "none", border: "none", borderBottom: i < results.length - 1 ? "1px solid #f7f8fc" : "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, marginRight: "8px" }}>
                      <p style={{ color: "#111118", fontSize: "13px", fontWeight: 700 }}>{food.name}</p>
                      <p style={{ color: "#9ca3af", fontSize: "10px", marginTop: "2px", fontWeight: 600 }}>{food.brand && food.brand + " · "}{food.serving}</p>
                    </div>
                    <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                      <p style={{ color: "#111118", fontSize: "13px", fontWeight: 700 }}>{food.calories} kcal</p>
                      <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 600 }}>{food.protein}g P</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: "12px" }}>
                  <p style={{ color: "#111118", fontSize: "14px", fontWeight: 800 }}>{selected.name}</p>
                  {selected.brand && <p style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px", fontWeight: 600 }}>{selected.brand}</p>}
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }} style={{ background: "#f1f5f9", border: "none", color: "#6b7280", fontSize: "16px", cursor: "pointer", width: 28, height: 28, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
              {!editingMacros && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", flexShrink: 0, fontWeight: 700 }}>Servings ({selected.serving})</p>
                  <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="0.25" step="0.25"
                    style={{ ...inputStyle, width: "90px" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {(["calories", "protein", "carbs", "fat", "fiber"] as const).map(key => (
                  <div key={key} style={{ textAlign: "center" as const, background: "#f7f8fc", borderRadius: "12px", padding: "10px 6px" }}>
                    {editingMacros ? (
                      <input type="number" value={(editedMacros as any)[key]}
                        onChange={e => setEditedMacros(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: "100%", background: "none", border: "none", color: "#111118", fontSize: "15px", fontWeight: 800, textAlign: "center" as const, outline: "none", fontFamily: "inherit" }} />
                    ) : (
                      <p style={{ fontSize: "15px", fontWeight: 800, color: "#111118" }}>{(macros as any)[key]}{key !== "calories" ? "g" : ""}</p>
                    )}
                    <p style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: "2px", fontWeight: 700 }}>{key === "calories" ? "kcal" : key}</p>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => setEditingMacros(!editingMacros)}
                    style={{ background: editingMacros ? "#111118" : "#f1f5f9", border: "none", borderRadius: "10px", padding: "6px 10px", color: editingMacros ? "white" : "#6b7280", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {editingMacros ? "Done" : "Edit"}
                  </button>
                </div>
              </div>
              {(selected.vitA || selected.vitC || selected.vitD || selected.calcium || selected.iron) && (
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" as const }}>
                  {selected.vitA && <VitBadge label="Vit A" color="#f59e0b" bg="#fef3c7" />}
                  {selected.vitC && <VitBadge label="Vit C" color="#f97316" bg="#fff7ed" />}
                  {selected.vitD && <VitBadge label="Vit D" color="#eab308" bg="#fefce8" />}
                  {selected.calcium && <VitBadge label="Calcium" color="#8b5cf6" bg="#f3e8ff" />}
                  {selected.iron && <VitBadge label="Iron" color="#ef4444" bg="#fee2e2" />}
                </div>
              )}
              <button onClick={saveSelected} disabled={saving}
                style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "white", fontWeight: 800, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Adding..." : "✓ Add to " + meal.charAt(0).toUpperCase() + meal.slice(1)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <input placeholder="Food name" value={manual.food} onChange={e => setManual(p => ({ ...p, food: e.target.value }))} style={{ ...inputStyle, fontSize: "15px" }} />
          
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Macros</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {(["calories", "protein", "carbs", "fat", "fiber"] as const).map(key => (
              <div key={key}>
                <p style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>{key}</p>
                <input type="number" placeholder="0" value={(manual as any)[key]}
                  onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
          </div>

          <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Vitamins & Minerals <span style={{ fontWeight: 600, textTransform: "none", fontSize: "9px" }}>(optional)</span></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {VITAMIN_FIELDS.map(({ key, label, color, bg }) => (
              <div key={key}>
                <p style={{ fontSize: "9px", color, fontWeight: 700, marginBottom: "4px", background: bg, display: "inline-block", padding: "1px 6px", borderRadius: "4px" }}>{label}</p>
                <input type="number" placeholder="0" value={(manual as any)[key]}
                  onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
          </div>

          <button onClick={saveManual} disabled={saving || !manual.food.trim()}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: manual.food.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#e5e7eb", border: "none", color: manual.food.trim() ? "white" : "#9ca3af", fontWeight: 800, fontSize: "13px", cursor: manual.food.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
            {saving ? "Adding..." : "✓ Add to " + meal.charAt(0).toUpperCase() + meal.slice(1)}
          </button>
        </div>
      )}
    </div>
  );
}

function VitBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: "10px", color, background: bg, borderRadius: "6px", padding: "3px 8px", fontWeight: 700 }}>{label}</span>;
}