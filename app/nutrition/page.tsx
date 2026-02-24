"use client";
import { useEffect, useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import NutritionSummaryCard from "@/components/nutrition/NutritionSummaryCard";
import FoodLogList from "@/components/nutrition/FoodLogList";
import QuickAddBar from "@/components/nutrition/QuickAddBar";
import {
  getNutritionForDate,
  getNutritionTotals,
  getSettings,
  deleteNutritionEntry,
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
  const [tab, setTab] = useState<"today" | "history">("today");
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
    if (date === today) {
      await computeMomentum(today);
      refreshMomentum();
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const days = Array.from({ length: 14 }, (_, i) =>
      format(subDays(new Date(), i + 1), "yyyy-MM-dd")
    );
    const results = await Promise.all(
      days.map(async date => ({ date, totals: await getNutritionTotals(date) }))
    );
    setHistory(results.filter(r => r.totals.calories > 0));
    setHistoryLoading(false);
  };

  useEffect(() => { refresh(); }, [selectedDate]);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  const handleDelete = async (id: string) => {
    await deleteNutritionEntry(id);
    await refresh();
  };

  const pct = (val: number, target: number) => Math.min(Math.round((val / target) * 100), 100);

  const MacroBar = ({ label, val, target, color }: { label: string; val: number; target: number; color: string }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "9px", color: "#a1a1aa", fontWeight: 600 }}>{Math.round(val)}g</p>
      </div>
      <div style={{ height: "3px", background: "#27272a", borderRadius: "999px" }}>
        <div style={{ width: `${pct(val, target)}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 500ms ease-out" }} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Nutrition</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "4px" }}>
        {(["today", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b",
          }}>{t === "today" ? "Today" : "History"}</button>
        ))}
      </div>

      {tab === "today" && (
        <>
          {/* Date selector */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = format(subDays(new Date(), i), "yyyy-MM-dd");
              const isSelected = d === selectedDate;
              return (
                <button key={d} onClick={() => setSelectedDate(d)} style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: isSelected ? "white" : "#18181b",
                  color: isSelected ? "black" : "#52525b",
                  fontSize: "11px", fontWeight: 700,
                }}>
                  {i === 0 ? "Today" : format(subDays(new Date(), i), "EEE d")}
                </button>
              );
            })}
          </div>

          <NutritionSummaryCard totals={totals} targets={targets} />
          {selectedDate === today && <QuickAddBar onAdd={() => refresh()} />}
          <div>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "12px" }}>
              {selectedDate === today ? "Today's Log" : `Log for ${format(new Date(selectedDate + "T12:00:00"), "MMM d")}`}
            </p>
            <FoodLogList entries={entries} onDelete={selectedDate === today ? handleDelete : () => {}} />
          </div>
        </>
      )}

      {tab === "history" && (
        historyLoading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No history yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {history.map(({ date, totals: t }) => {
              const calPct = pct(t.calories, targets.calories);
              return (
                <div key={date} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}
                  onClick={() => { setSelectedDate(date); setTab("today"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <p style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>{format(new Date(date + "T12:00:00"), "EEEE, MMM d")}</p>
                      <p style={{ color: "#52525b", fontSize: "11px", marginTop: "2px" }}>{Math.round(t.calories)} kcal · {Math.round(t.protein)}g protein</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "22px", fontWeight: 700, color: calPct >= 90 ? "#34d399" : calPct >= 60 ? "white" : "#f87171" }}>{calPct}%</p>
                      <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>of goal</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <MacroBar label="Protein" val={t.protein} target={targets.protein} color="#3b82f6" />
                    <MacroBar label="Carbs" val={t.carbs} target={targets.carbs} color="#f59e0b" />
                    <MacroBar label="Fat" val={t.fat} target={targets.fat} color="#ec4899" />
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
