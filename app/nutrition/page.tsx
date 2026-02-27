"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import NutritionSummaryCard from "@/components/nutrition/NutritionSummaryCard";
import FoodLogList from "@/components/nutrition/FoodLogList";
import QuickAddBar from "@/components/nutrition/QuickAddBar";
import {
  getNutritionForDate, getNutritionTotals, getSettings, deleteNutritionEntry,
} from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import type { MacroTargets, NutritionEntry } from "@/types";
import { format, subDays } from "date-fns";

export default function NutritionPage() {
  const { refreshMomentum } = useLifeStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [totals, setTotals] = useState<MacroTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [targets, setTargets] = useState<MacroTargets>({ calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 });
  const [tab, setTab] = useState<"log" | "add" | "history">("log");
  const [history, setHistory] = useState<Array<{ date: string; totals: MacroTargets }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const refresh = async (date = selectedDate) => {
    const [e, t, s] = await Promise.all([
      getNutritionForDate(date),
      getNutritionTotals(date),
      getSettings(),
    ]);
    setEntries(e);
    setTotals(t);
    setTargets(s.macroTargets);
  };

  useEffect(() => { refresh(); }, [selectedDate]);

  useEffect(() => {
    if (tab !== "history" || history.length > 0) return;
    setHistoryLoading(true);
    Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        return getNutritionTotals(date).then(t => ({ date, totals: t }));
      })
    ).then(data => { setHistory(data); setHistoryLoading(false); });
  }, [tab]);

  const handleDelete = async (id: string) => {
    await deleteNutritionEntry(id);
    await computeMomentum(selectedDate);
    await refresh();
    refreshMomentum();
  };

  const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer",
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
      background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Nutrition</p>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>
            {selectedDate === today ? "Today" : format(new Date(selectedDate + "T12:00:00"), "MMM d")}
          </p>
        </div>
        <p style={{ color: "#52525b", fontSize: "22px", fontWeight: 700 }}>{Math.round(totals.calories)} <span style={{ fontSize: "12px" }}>kcal</span></p>
      </div>

      {/* Date picker */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "4px" }}>
        {days.map(d => {
          const isSelected = d === selectedDate;
          const isToday = d === today;
          return (
            <button key={d} onClick={() => setSelectedDate(d)} style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: "12px", border: "none", cursor: "pointer",
              background: isSelected ? "white" : "#18181b",
              color: isSelected ? "black" : isToday ? "white" : "#52525b",
              fontSize: "11px", fontWeight: 700,
            }}>
              {isToday ? "Today" : format(new Date(d + "T12:00:00"), "EEE d")}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <NutritionSummaryCard totals={totals} targets={targets} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "4px" }}>
        {tabBtn("log", "📋 Log")}
        {tabBtn("add", "➕ Add")}
        {tabBtn("history", "📊 History")}
      </div>

      {/* Log tab */}
      {tab === "log" && (
        entries.length === 0 ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Nothing logged yet</p>
            <button onClick={() => setTab("add")} style={{ marginTop: "12px", padding: "10px 20px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
              Add Food →
            </button>
          </div>
        ) : (
          <FoodLogList entries={entries} onDelete={handleDelete} />
        )
      )}

      {/* Add tab */}
      {tab === "add" && (
        <QuickAddBar onAdd={async () => { await refresh(); setTab("log"); refreshMomentum(); }} />
      )}

      {/* History tab */}
      {tab === "history" && (
        historyLoading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
          </div>
        ) : (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            {history.map((h, i) => {
              const isToday = h.date === today;
              const calPct = Math.min(h.totals.calories / targets.calories, 1);
              const protPct = Math.min(h.totals.protein / targets.protein, 1);
              const hit = calPct >= 0.8 && protPct >= 0.8;
              return (
                <div key={h.date} onClick={() => { setSelectedDate(h.date); setTab("log"); }}
                  style={{ padding: "14px 20px", borderBottom: i < history.length - 1 ? "1px solid #27272a" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: h.totals.calories === 0 ? "#27272a" : hit ? "#34d399" : "#f59e0b", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: isToday ? "white" : "#a1a1aa", fontWeight: 600, fontSize: "13px" }}>
                      {isToday ? "Today" : format(new Date(h.date + "T12:00:00"), "EEE, MMM d")}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <div style={{ height: "2px", flex: calPct, background: "#34d399", borderRadius: "999px", maxWidth: `${calPct * 60}px` }} />
                      <div style={{ height: "2px", flex: 1 - calPct, background: "#27272a", borderRadius: "999px" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: h.totals.calories === 0 ? "#3f3f46" : "white", fontSize: "14px", fontWeight: 700 }}>
                      {h.totals.calories === 0 ? "—" : `${Math.round(h.totals.calories)}`}
                    </p>
                    <p style={{ color: "#52525b", fontSize: "10px" }}>kcal</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
