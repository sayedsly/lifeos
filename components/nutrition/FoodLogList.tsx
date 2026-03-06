"use client";
import type { NutritionEntry, MealCategory } from "@/types";

interface Props {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
  onQuickAdd: (entry: NutritionEntry) => void;
}

const MEAL_ORDER: MealCategory[] = ["breakfast", "lunch", "dinner", "snack", "supplement", "uncategorized"];
const MEAL_LABELS: Record<MealCategory, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
  supplement: "💊 Supplements",
  uncategorized: "📝 Other",
};

export default function FoodLogList({ entries, onDelete, onQuickAdd }: Props) {
  if (entries.length === 0) return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "32px 20px", textAlign: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Nothing logged yet</p>
    </div>
  );

  // Group by meal
  const grouped: Partial<Record<MealCategory, NutritionEntry[]>> = {};
  entries.forEach(e => {
    const meal = (e.meal || "uncategorized") as MealCategory;
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal]!.push(e);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {MEAL_ORDER.filter(m => grouped[m]?.length).map(meal => {
        const mealEntries = grouped[meal]!;
        const mealCals = Math.round(mealEntries.reduce((a, e) => a + e.calories, 0));
        const mealProtein = Math.round(mealEntries.reduce((a, e) => a + e.protein, 0) * 10) / 10;
        return (
          <div key={meal} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #27272a" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>{MEAL_LABELS[meal]}</p>
              <p style={{ fontSize: "10px", color: "#52525b" }}>{mealCals} kcal · {mealProtein}g protein</p>
            </div>
            {mealEntries.map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < mealEntries.length - 1 ? "1px solid #27272a" : "none" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: 500 }}>{e.food}</p>
                  <p style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.05em", marginTop: "2px" }}>
                    {e.calories}kcal · {e.protein}g prot · {e.carbs}g carbs · {e.fat}g fat{e.fiber ? ` · ${e.fiber}g fiber` : ""}
                  </p>
                  {e.vitamins && Object.values(e.vitamins).some(v => v) && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {e.vitamins.vitA && <span style={{ fontSize: "9px", color: "#f59e0b", background: "#1c1400", borderRadius: "4px", padding: "1px 6px" }}>Vit A</span>}
                      {e.vitamins.vitC && <span style={{ fontSize: "9px", color: "#f97316", background: "#1c0a00", borderRadius: "4px", padding: "1px 6px" }}>Vit C</span>}
                      {e.vitamins.vitD && <span style={{ fontSize: "9px", color: "#facc15", background: "#1c1800", borderRadius: "4px", padding: "1px 6px" }}>Vit D</span>}
                      {e.vitamins.calcium && <span style={{ fontSize: "9px", color: "#a78bfa", background: "#13001c", borderRadius: "4px", padding: "1px 6px" }}>Ca</span>}
                      {e.vitamins.iron && <span style={{ fontSize: "9px", color: "#f87171", background: "#1c0000", borderRadius: "4px", padding: "1px 6px" }}>Iron</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => onQuickAdd(e)} title="Add again"
                  style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "16px", cursor: "pointer", padding: "4px 8px" }}>+</button>
                <button onClick={() => onDelete(e.id)}
                  style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>×</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
