"use client";
import type { NutritionEntry, MealCategory } from "@/types";

interface Props {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
  onQuickAdd: (entry: NutritionEntry) => void;
}

const MEAL_ORDER: MealCategory[] = ["breakfast", "lunch", "dinner", "snack", "supplement", "uncategorized"];
const MEAL_LABELS: Record<MealCategory, string> = {
  breakfast: "🌅 Breakfast", lunch: "☀️ Lunch", dinner: "🌙 Dinner",
  snack: "🍎 Snack", supplement: "💊 Supplements", uncategorized: "📝 Other",
};
const MEAL_DOTS: Record<MealCategory, string> = {
  breakfast: "#f97316", lunch: "#f59e0b", dinner: "#8b5cf6",
  snack: "#22c55e", supplement: "#6366f1", uncategorized: "#9ca3af",
};

export default function FoodLogList({ entries, onDelete, onQuickAdd }: Props) {
  if (entries.length === 0) return (
    <div style={{ background: "white", borderRadius: "24px", padding: "40px 20px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: "32px", marginBottom: "10px" }}>🍽️</p>
      <p style={{ color: "#374151", fontSize: "15px", fontWeight: 700 }}>Nothing logged yet</p>
      <p style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>Tap "Add" to log your meals</p>
    </div>
  );

  const grouped: Partial<Record<MealCategory, NutritionEntry[]>> = {};
  entries.forEach(e => {
    const meal = (e.meal || "uncategorized") as MealCategory;
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal]!.push(e);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {MEAL_ORDER.filter(m => grouped[m]?.length).map(meal => {
        const mealEntries = grouped[meal]!;
        const mealCals = Math.round(mealEntries.reduce((a, e) => a + e.calories, 0));
        const mealProtein = Math.round(mealEntries.reduce((a, e) => a + e.protein, 0));
        return (
          <div key={meal} style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid #f7f8fc" }}>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#111118" }}>{MEAL_LABELS[meal]}</p>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>{mealCals} kcal · {mealProtein}g P</p>
            </div>
            {mealEntries.map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: i < mealEntries.length - 1 ? "1px solid #f7f8fc" : "none", gap: "10px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: MEAL_DOTS[meal], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#111118", fontSize: "13px", fontWeight: 600 }}>{e.food}</p>
                  <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 600, marginTop: "1px" }}>
                    {e.calories} kcal · {e.protein}g P · {e.carbs}g C · {e.fat}g F
                  </p>
                  {e.vitamins && Object.values(e.vitamins).some(v => v) && (
                    <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" as const, marginTop: "3px" }}>
                      {e.vitamins.vitA && <span style={{ fontSize: "8px", color: "#f59e0b", background: "#fef3c7", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>Vit A</span>}
                      {e.vitamins.vitC && <span style={{ fontSize: "8px", color: "#f97316", background: "#fff7ed", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>Vit C</span>}
                      {e.vitamins.vitD && <span style={{ fontSize: "8px", color: "#eab308", background: "#fefce8", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>Vit D</span>}
                      {e.vitamins.calcium && <span style={{ fontSize: "8px", color: "#8b5cf6", background: "#f3e8ff", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>Ca</span>}
                      {e.vitamins.iron && <span style={{ fontSize: "8px", color: "#ef4444", background: "#fee2e2", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>Iron</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => onQuickAdd(e)}
                  style={{ width: 28, height: 28, borderRadius: "8px", background: "#f7f8fc", border: "none", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", flexShrink: 0 }}>+</button>
                <button onClick={() => onDelete(e.id)}
                  style={{ width: 28, height: 28, borderRadius: "8px", background: "#fef2f2", border: "none", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}