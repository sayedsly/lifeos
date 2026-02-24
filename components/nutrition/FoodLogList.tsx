"use client";
import type { NutritionEntry } from "@/types";

interface Props {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
}

export default function FoodLogList({ entries, onDelete }: Props) {
  if (entries.length === 0) return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "32px 20px", textAlign: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Nothing logged yet</p>
    </div>
  );

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
      {entries.map((e, i) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < entries.length - 1 ? "1px solid #27272a" : "none" }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>{e.food}</p>
            <p style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>
              {e.calories}kcal · {e.protein}g protein
            </p>
          </div>
          <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>×</button>
        </div>
      ))}
    </div>
  );
}
