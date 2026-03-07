"use client";
import { useEffect, useState } from "react";
import { getFinanceGoals, addFinanceGoal, getFinanceTransactions, addFinanceTransaction } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { FinanceGoal, FinanceTransaction } from "@/types";

const EXPENSE_CATEGORIES = [
  { key: "Housing", emoji: "🏠", color: "#6366f1", bg: "#e0e7ff" },
  { key: "Food", emoji: "🍔", color: "#f59e0b", bg: "#fef3c7" },
  { key: "Transport", emoji: "🚗", color: "#3b82f6", bg: "#dbeafe" },
  { key: "Health", emoji: "💊", color: "#22c55e", bg: "#dcfce7" },
  { key: "Shopping", emoji: "🛍️", color: "#ec4899", bg: "#fce7f3" },
  { key: "Entertainment", emoji: "🎬", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "Subscriptions", emoji: "📱", color: "#06b6d4", bg: "#cffafe" },
  { key: "Other", emoji: "💸", color: "#9ca3af", bg: "#f3f4f6" },
];

const INCOME_CATEGORIES = [
  { key: "Salary", emoji: "💼", color: "#22c55e", bg: "#dcfce7" },
  { key: "Freelance", emoji: "💻", color: "#3b82f6", bg: "#dbeafe" },
  { key: "Investment", emoji: "📈", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "Gift", emoji: "🎁", color: "#f59e0b", bg: "#fef3c7" },
  { key: "Other", emoji: "💰", color: "#9ca3af", bg: "#f3f4f6" },
];

type Tab = "overview" | "expenses" | "income" | "goals";

export default function FinancePage() {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [entries, setEntries] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editGoalName, setEditGoalName] = useState("");
  const [editGoalTarget, setEditGoalTarget] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income" | "savings">("expense");
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", category: "Other", goalId: "" });
  const [goalForm, setGoalForm] = useState({ name: "", target: "" });
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const load = async () => {
    const [g, e] = await Promise.all([getFinanceGoals(), getFinanceTransactions()]);
    setGoals(g); setEntries(e); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const thisMonth = entries.filter(e => {
    try { return isWithinInterval(new Date(e.date + "T12:00:00"), { start: monthStart, end: monthEnd }); }
    catch { return false; }
  });

  const monthExpenses = thisMonth.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const monthIncome = thisMonth.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalSaved = entries.filter(e => e.type === "income" && (e as any).goal_id).reduce((s, e) => s + e.amount, 0);
  const net = monthIncome - monthExpenses;

  const handleAdd = async () => {
    if (!form.amount) return;
    setSaving(true);
    const isGoalSaving = addType === "savings";
    await addFinanceTransaction({
      id: Math.random().toString(36).slice(2),
      date: today,
      timestamp: Date.now(),
      amount: parseFloat(form.amount),
      description: form.description || form.category,
      ...(({ category: form.category, type: isGoalSaving ? "income" : addType, goalId: isGoalSaving ? form.goalId : undefined }) as any),
    } as any);
    setForm({ amount: "", description: "", category: "Other", goalId: "" });
    setShowAdd(false);
    await computeMomentum(today);
    setSaving(false);
    load();
  };

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) return;
    setSaving(true);
    await addFinanceGoal({ id: Math.random().toString(36).slice(2), name: goalForm.name, target: parseFloat(goalForm.target), current: 0, currency: "USD", createdAt: Date.now() });
    setGoalForm({ name: "", target: "" });
    setShowAddGoal(false);
    setSaving(false);
    load();
  };

  const categories = addType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm("Delete this goal?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("finance_goals").delete().eq("id", goalId).eq("user_id", session.user.id);
    setGoals((prev: any[]) => prev.filter((g: any) => g.id !== goalId));
  };

  const handleSaveGoal = async () => {
    if (!editingGoal) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const newTarget = parseFloat(editGoalTarget) || editingGoal.target;
    await supabase.from("finance_goals").update({ name: editGoalName, target: newTarget }).eq("id", editingGoal.id).eq("user_id", session.user.id);
    setGoals((prev: any[]) => prev.map((g: any) => g.id === editingGoal.id ? { ...g, name: editGoalName, target: newTarget } : g));
    setEditingGoal(null);
  };

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
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>{format(new Date(), "MMMM yyyy")}</p>
          <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Finance</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setShowAdd(!showAdd); setShowAddGoal(false); }}
            style={{ padding: "9px 14px", background: "#111118", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "inherit" }}>
            + Add
          </button>
        </div>
      </div>

      {/* Monthly summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ background: "white", borderRadius: "18px", padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" as const }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Income</p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: "#111118" }}>${monthIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div style={{ background: "white", borderRadius: "18px", padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" as const }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Expenses</p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: "#111118" }}>${monthExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div style={{ background: net >= 0 ? "linear-gradient(135deg,#dcfce7,#bbf7d0)" : "linear-gradient(135deg,#fee2e2,#fecaca)", borderRadius: "18px", padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" as const }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: net >= 0 ? "#15803d" : "#b91c1c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Net</p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: net >= 0 ? "#15803d" : "#b91c1c" }}>{net >= 0 ? "+" : ""}${Math.abs(net).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Add transaction form */}
      {showAdd && (
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Type toggle */}
          <div style={{ display: "flex", gap: "3px", background: "#f7f8fc", borderRadius: "14px", padding: "3px" }}>
            {([
              { val: "expense", label: "💸 Expense" },
              { val: "income", label: "💵 Income" },
              { val: "savings", label: "🎯 Savings" },
            ] as const).map(t => (
              <button key={t.val} onClick={() => { setAddType(t.val); setForm(f => ({ ...f, category: "Other" })); }}
                style={{ flex: 1, padding: "8px", borderRadius: "11px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 700,
                  background: addType === t.val ? "#111118" : "transparent",
                  color: addType === t.val ? "white" : "#9ca3af" }}>
                {t.label}
              </button>
            ))}
          </div>

          <input type="number" placeholder="Amount ($)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "13px 16px", fontSize: "20px", fontWeight: 800, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }} />

          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "11px 14px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }} />

          {addType !== "savings" && (
            <>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Category</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                {categories.map(cat => (
                  <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                    style={{ padding: "7px 12px", borderRadius: "999px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 700,
                      background: form.category === cat.key ? cat.bg : "#f7f8fc",
                      color: form.category === cat.key ? cat.color : "#9ca3af",
                      outline: form.category === cat.key ? `2px solid ${cat.color}` : "none" }}>
                    {cat.emoji} {cat.key}
                  </button>
                ))}
              </div>
            </>
          )}

          {addType === "savings" && goals.length > 0 && (
            <select value={form.goalId} onChange={e => setForm(f => ({ ...f, goalId: e.target.value }))}
              style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "11px 14px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%" }}>
              <option value="">Select a goal (optional)</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={saving || !form.amount}
              style={{ flex: 1, padding: "13px", background: form.amount ? "#111118" : "#e5e7eb", border: "none", borderRadius: "12px", color: form.amount ? "white" : "#9ca3af", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving..." : "Add"}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ padding: "13px 16px", background: "#f1f5f9", border: "none", borderRadius: "12px", color: "#6b7280", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {([
          { val: "overview", label: "📊 Overview" },
          { val: "expenses", label: "💸 Expenses" },
          { val: "income", label: "💵 Income" },
          { val: "goals", label: "🎯 Goals" },
        ] as const).map(t => (
          <button key={t.val} onClick={() => setTab(t.val)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: "12px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 700,
              background: tab === t.val ? "#111118" : "transparent", color: tab === t.val ? "white" : "#9ca3af" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Category breakdown */}
          {monthExpenses > 0 && (
            <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px" }}>Spending by Category</p>
              {EXPENSE_CATEGORIES.map(cat => {
                const catTotal = thisMonth.filter(e => e.type === "expense" && e.category === cat.key).reduce((s, e) => s + e.amount, 0);
                if (catTotal === 0) return null;
                const pct = catTotal / monthExpenses;
                return (
                  <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "16px", width: 24, textAlign: "center" as const }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>{cat.key}</p>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#111118" }}>${catTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ width: `${pct * 100}%`, height: "100%", background: cat.color, borderRadius: "999px", transition: "width 0.5s ease-out" }} />
                      </div>
                    </div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, width: 32, textAlign: "right" as const }}>{Math.round(pct * 100)}%</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent transactions */}
          {entries.length > 0 && (
            <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>Recent</p>
              {entries.slice(0, 10).map((e, i) => {
                const cat = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.key === e.category) || EXPENSE_CATEGORIES[7];
                const isExpense = e.type === "expense";
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < Math.min(entries.length, 10) - 1 ? "1px solid #f7f8fc" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                      {cat.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{e.description || e.category}</p>
                      <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, marginTop: "1px" }}>{format(new Date(e.date + "T00:00:00"), "MMM d")} · {e.category}</p>
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: isExpense ? "#ef4444" : "#22c55e" }}>
                      {isExpense ? "-" : "+"}${e.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {entries.length === 0 && (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "32px", marginBottom: "10px" }}>💰</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No transactions yet</p>
              <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Tap "+ Add" to log an expense or income</p>
            </div>
          )}
        </div>
      )}

      {/* EXPENSES TAB */}
      {tab === "expenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.filter(e => e.type === "expense").length === 0 ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "28px", marginBottom: "8px" }}>💸</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>No expenses logged</p>
            </div>
          ) : entries.filter(e => e.type === "expense").map((e, i, arr) => {
            const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category) || EXPENSE_CATEGORIES[7];
            return (
              <div key={e.id} style={{ background: "white", borderRadius: "16px", padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "12px", background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{e.description || e.category}</p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, marginTop: "2px" }}>{format(new Date(e.date + "T00:00:00"), "MMM d")} · {cat.key}</p>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#ef4444" }}>-${e.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* INCOME TAB */}
      {tab === "income" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.filter(e => e.type === "income").length === 0 ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "28px", marginBottom: "8px" }}>💵</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>No income logged</p>
            </div>
          ) : entries.filter(e => e.type === "income").map(e => {
            const cat = INCOME_CATEGORIES.find(c => c.key === e.category) || INCOME_CATEGORIES[4];
            return (
              <div key={e.id} style={{ background: "white", borderRadius: "16px", padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "12px", background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{e.description || e.category}</p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, marginTop: "2px" }}>{format(new Date(e.date + "T00:00:00"), "MMM d")} · {cat.key}</p>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#22c55e" }}>+${e.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* GOALS TAB */}
      {tab === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={() => setShowAddGoal(!showAddGoal)}
            style={{ padding: "13px", background: "white", border: "1.5px dashed #e5e7eb", borderRadius: "16px", color: "#6b7280", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            + New Savings Goal
          </button>

          {showAddGoal && (
            <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <input placeholder="Goal name (e.g. Emergency Fund)" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }} />
              <input type="number" placeholder="Target amount ($)" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
                style={{ background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", fontSize: "18px", fontWeight: 800, color: "#111118", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleAddGoal} disabled={saving || !goalForm.name || !goalForm.target}
                  style={{ flex: 1, padding: "12px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Create</button>
                <button onClick={() => setShowAddGoal(false)}
                  style={{ padding: "12px 16px", background: "#f1f5f9", border: "none", borderRadius: "12px", color: "#6b7280", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          )}

          {goals.length === 0 && !showAddGoal ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "32px", marginBottom: "10px" }}>🎯</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No goals yet</p>
            </div>
          ) : goals.map(goal => {
            const goalEntries = entries.filter((e: any) => e.goal_id === goal.id || e.goalId === goal.id);
            const saved = goalEntries.reduce((s, e) => s + e.amount, 0);
            const pct = Math.min(saved / goal.target, 1);
            const remaining = Math.max(goal.target - saved, 0);
            return (
              <div key={goal.id} style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 800, color: "#111118" }}>{goal.name}</p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, marginTop: "2px" }}>${saved.toLocaleString()} saved · ${remaining.toLocaleString()} to go</p>
                  </div>
                  <div style={{ textAlign: "right" as const }}>
                    <p style={{ fontSize: "22px", fontWeight: 900, color: pct >= 1 ? "#22c55e" : "#111118" }}>{Math.round(pct * 100)}%</p>
                    <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>of ${goal.target.toLocaleString()}</p>
                  </div>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: pct >= 1 ? "linear-gradient(90deg,#86efac,#22c55e)" : "linear-gradient(90deg,#6ee7f7,#3b82f6)", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
                {pct >= 1 && <p style={{ fontSize: "12px", color: "#22c55e", fontWeight: 700, marginTop: "8px", textAlign: "center" as const }}>🎉 Goal reached!</p>}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                  <button onClick={() => { setEditingGoal(goal); setEditGoalName(goal.name); setEditGoalTarget(String(goal.target)); }}
                    style={{ flex: 1, padding: "8px", background: "#e0e7ff", border: "none", borderRadius: "10px", fontSize: "11px", fontWeight: 700, color: "#4338ca", cursor: "pointer", fontFamily: "inherit" }}>✏️ Edit</button>
                  <button onClick={() => handleDeleteGoal(goal.id)}
                    style={{ flex: 1, padding: "8px", background: "#fef2f2", border: "none", borderRadius: "10px", fontSize: "11px", fontWeight: 700, color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    {editingGoal && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }} onClick={() => setEditingGoal(null)}>
        <div style={{ background: "white", borderRadius: "24px", padding: "24px", width: "100%", maxWidth: "360px" }} onClick={e => e.stopPropagation()}>
          <p style={{ fontSize: "16px", fontWeight: 800, color: "#111118", marginBottom: "16px" }}>Edit Goal</p>
          <input value={editGoalName} onChange={e => setEditGoalName(e.target.value)} placeholder="Goal name"
            style={{ width: "100%", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", marginBottom: "10px", boxSizing: "border-box" as const }} />
          <input value={editGoalTarget} onChange={e => setEditGoalTarget(e.target.value)} placeholder="Target amount ($)" type="number"
            style={{ width: "100%", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit", marginBottom: "16px", boxSizing: "border-box" as const }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setEditingGoal(null)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSaveGoal} style={{ flex: 1, padding: "12px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}