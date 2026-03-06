"use client";
import { useEffect, useState } from "react";
import { getFinanceGoals, addFinanceGoal, getFinanceTransactions, addFinanceTransaction } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";
import type { FinanceGoal, FinanceTransaction } from "@/types";

export default function FinancePage() {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [entries, setEntries] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "" });
  const [entryForm, setEntryForm] = useState({ amount: "", description: "", goalId: "" });
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const load = async () => {
    const [g, e] = await Promise.all([getFinanceGoals(), getFinanceTransactions()]);
    setGoals(g); setEntries(e); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) return;
    setSaving(true);
    await addFinanceGoal({ id: Math.random().toString(36).slice(2), name: goalForm.name, target: parseFloat(goalForm.target), current: 0, currency: "USD", createdAt: Date.now() });
    setGoalForm({ name: "", target: "" });
    setShowAddGoal(false);
    setSaving(false);
    load();
  };

  const handleAddEntry = async () => {
    if (!entryForm.amount) return;
    setSaving(true);
    await addFinanceTransaction({ id: Math.random().toString(36).slice(2), date: today, amount: parseFloat(entryForm.amount), description: entryForm.description, goalId: entryForm.goalId || undefined, timestamp: Date.now() });
    setEntryForm({ amount: "", description: "", goalId: "" });
    setShowAddEntry(false);
    await computeMomentum(today);
    setSaving(false);
    load();
  };

  const totalSaved = entries.reduce((sum, e) => sum + e.amount, 0);


  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>Finance</p>
          <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>${totalSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })} saved</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-press" onClick={() => setShowAddEntry(!showAddEntry)}
            style={{ padding: "9px 14px", background: "#f1f5f9", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>+ Log</button>
          <button className="btn-press" onClick={() => setShowAddGoal(!showAddGoal)}
            style={{ padding: "9px 14px", background: "#111118", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "inherit" }}>+ Goal</button>
        </div>
      </div>

      {/* Add entry form */}
      {showAddEntry && (
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#111118" }}>Log Savings</p>
          <input type="number" placeholder="Amount ($)" value={entryForm.amount} onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "16px", fontWeight: 700, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }} />
          <input placeholder="Description (optional)" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }} />
          {goals.length > 0 && (
            <select value={entryForm.goalId} onChange={e => setEntryForm(f => ({ ...f, goalId: e.target.value }))}
              style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }}>
              <option value="">No goal</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-press" onClick={handleAddEntry} disabled={saving || !entryForm.amount}
              style={{ flex: 1, padding: "12px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button className="btn-press" onClick={() => setShowAddEntry(false)}
              style={{ padding: "12px 16px", background: "#f1f5f9", border: "none", borderRadius: "12px", color: "#6b7280", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add goal form */}
      {showAddGoal && (
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#111118" }}>New Goal</p>

          <input placeholder="Goal name (e.g. Emergency Fund)" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }} />
          <input type="number" placeholder="Target amount ($)" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "16px", fontWeight: 700, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-press" onClick={handleAddGoal} disabled={saving || !goalForm.name || !goalForm.target}
              style={{ flex: 1, padding: "12px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Create Goal</button>
            <button className="btn-press" onClick={() => setShowAddGoal(false)}
              style={{ padding: "12px 16px", background: "#f1f5f9", border: "none", borderRadius: "12px", color: "#6b7280", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length === 0 ? (
        <div style={{ background: "white", borderRadius: "24px", padding: "40px 20px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "32px", marginBottom: "10px" }}>💰</p>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No goals yet</p>
          <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Tap "+ Goal" to create your first</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {goals.map(goal => {
            const goalEntries = entries.filter((e: any) => e.goal_id === goal.id || e.goalId === goal.id);
            const saved = goalEntries.reduce((s, e) => s + e.amount, 0);
            const pct = Math.min(saved / goal.target, 1);
            return (
              <div key={goal.id} style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "28px" }}>{"🎯"}</span>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111118" }}>{goal.name}</p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, marginTop: "1px" }}>${saved.toLocaleString()} of ${goal.target.toLocaleString()}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: pct >= 1 ? "#22c55e" : "#374151" }}>{Math.round(pct * 100)}%</p>
                </div>
                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: pct >= 1 ? "linear-gradient(90deg,#86efac,#22c55e)" : "linear-gradient(90deg,#6ee7f7,#3b82f6)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Recent</p>
          {entries.slice(0, 8).map((e, i) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < Math.min(entries.length, 8) - 1 ? "1px solid #f7f8fc" : "none" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{e.description || "Savings"}</p>
                <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, marginTop: "1px" }}>{format(new Date(e.date + "T00:00:00"), "MMM d")}</p>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>+${e.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}