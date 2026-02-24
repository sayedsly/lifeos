"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { FinanceGoal, FinanceTransaction } from "@/types";
import FinanceGoalCard from "@/components/finance/FinanceGoalCard";
import AddGoalForm from "@/components/finance/AddGoalForm";
import ExpenseLog from "@/components/finance/ExpenseLog";
import { format } from "date-fns";

export default function FinancePage() {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [g, t] = await Promise.all([
      supabase.from("finance_goals").select("*").eq("user_id", user.id),
      supabase.from("finance_transactions").select("*").eq("user_id", user.id).order("timestamp", { ascending: false }),
    ]);
    setGoals((g.data || []).map((r: any) => ({
      id: r.id, name: r.name, target: r.target,
      current: r.current, currency: r.currency, createdAt: r.created_at,
    })));
    setTransactions((t.data || []).map((r: any) => ({
      id: r.id, date: r.date, timestamp: r.timestamp,
      amount: r.amount, category: r.category,
      description: r.description, type: r.type,
    })));
  };

  useEffect(() => { load(); }, []);

  const addToGoal = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    await supabase.from("finance_goals").update({ current: goal.current + amount }).eq("id", id);
    load();
  };

  const monthlySpend = transactions
    .filter(t => t.date.startsWith(format(new Date(), "yyyy-MM")))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Finance</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "MMMM yyyy")}</p>
      </div>

      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Spent This Month</p>
        <p style={{ fontSize: "40px", fontWeight: 700, color: "white" }}>${monthlySpend.toFixed(2)}</p>
      </div>

      {goals.length > 0 && (
        <div className="space-y-3">
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Goals</p>
          {goals.map(goal => (
            <FinanceGoalCard key={goal.id} goal={goal} onAdd={addToGoal} />
          ))}
        </div>
      )}

      <AddGoalForm onAdd={load} />
      <ExpenseLog transactions={transactions} onAdd={load} />
    </div>
  );
}
