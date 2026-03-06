"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import NutritionSummaryCard from "@/components/nutrition/NutritionSummaryCard";
import FoodLogList from "@/components/nutrition/FoodLogList";
import QuickAddBar from "@/components/nutrition/QuickAddBar";
import {
  getNutritionForDate, getNutritionTotals, getSettings,
  deleteNutritionEntry, addNutritionEntry,
} from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import type { MacroTargets, NutritionEntry, MealCategory } from "@/types";
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
    refresh();
    refreshMomentum();
  };

  const handleQuickAdd = async (entry: NutritionEntry) => {
    await addNutritionEntry({
      ...entry,
      id: Math.random().toString(36).slice(2),
      date: today,
      timestamp: Date.now(),
    });
    await computeMomentum(today);
    refresh(today);
    refreshMomentum();
  };

  const calPct = Math.min(totals.calories / targets.calories, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>Today</p>
          <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Nutrition</p>
        </div>
        {selectedDate !== today && (
          <button onClick={() => setSelectedDate(today)}
            style={{ background: "#f1f5f9", border: "none", borderRadius: "12px", padding: "9px 14px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Today
          </button>
        )}
      </div>

      {/* Calorie summary ring card */}
      <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {/* Ring */}
          <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="45" cy="45" r="36" fill="none" stroke="#f1f5f9" strokeWidth="7" />
              <circle cx="45" cy="45" r="36" fill="none"
                stroke={calPct > 0.95 ? "#ef4444" : calPct > 0.8 ? "#f59e0b" : "#22c55e"}
                strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - calPct)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "#111118", lineHeight: 1 }}>{Math.round(calPct * 100)}%</p>
              <p style={{ fontSize: "8px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>goal</p>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "34px", fontWeight: 900, color: "#111118", letterSpacing: "-2px", lineHeight: 1 }}>{totals.calories.toLocaleString()}</p>
            <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600, marginTop: "2px" }}>
              of {targets.calories.toLocaleString()} kcal ·{" "}
              <span style={{ color: "#22c55e", fontWeight: 700 }}>{Math.max(0, targets.calories - totals.calories)} left</span>
            </p>
          </div>
        </div>
        {/* Macro chips */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "16px" }}>
          {[
            { label: "Protein", val: totals.protein, target: targets.protein, color: "#f97316" },
            { label: "Carbs", val: totals.carbs, target: targets.carbs, color: "#6366f1" },
            { label: "Fat", val: totals.fat, target: targets.fat, color: "#f59e0b" },
            { label: "Fiber", val: totals.fiber, target: targets.fiber, color: "#22c55e" },
          ].map(({ label, val, target, color }) => (
            <div key={label} style={{ background: "#f7f8fc", borderRadius: "14px", padding: "10px 6px", textAlign: "center" as const }}>
              <p style={{ fontSize: "17px", fontWeight: 800, color, lineHeight: 1 }}>{Math.round(val)}</p>
              <p style={{ fontSize: "9px", color: "#9ca3af", fontWeight: 600, marginTop: "1px" }}>/{target}g</p>
              <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "3px" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date nav */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto" as const, paddingBottom: "2px" }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = format(subDays(new Date(), i), "yyyy-MM-dd");
          const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : format(subDays(new Date(), i), "EEE d");
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "999px", border: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, cursor: "pointer", background: selectedDate === d ? "#111118" : "white", color: selectedDate === d ? "white" : "#6b7280", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.15s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["log", "add", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px", borderRadius: "12px", border: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, cursor: "pointer", background: tab === t ? "#111118" : "transparent", color: tab === t ? "white" : "#9ca3af", transition: "all 0.15s" }}>
            {t === "log" ? "📋 Log" : t === "add" ? "➕ Add" : "📊 History"}
          </button>
        ))}
      </div>

      {tab === "log" && <FoodLogList entries={entries} onDelete={handleDelete} onQuickAdd={handleQuickAdd} />}
      {tab === "add" && <QuickAddBar onAdd={() => { refresh(); refreshMomentum(); }} />}
      {tab === "history" && (
        <div style={{ background: "white", borderRadius: "24px", padding: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          {historyLoading ? (
            <p style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center" }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {history.map(({ date, totals: t }) => (
                <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{format(new Date(date + "T00:00:00"), "EEE, MMM d")}</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{t.calories} kcal</span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>{Math.round(t.protein)}g P</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}