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
