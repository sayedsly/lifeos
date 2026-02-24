"use client";
import { useState } from "react";
import type { FinanceTransaction } from "@/types";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";

interface Props {
  transactions: FinanceTransaction[];
  onAdd: () => void;
}

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Health", "Bills", "Other"];

export default function ExpenseLog({ transactions, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("finance_transactions").insert({
      id: Math.random().toString(36).slice(2),
      user_id: user.id,
      date: format(new Date(), "yyyy-MM-dd"),
      timestamp: Date.now(),
      amount: parseFloat(amount),
      category,
      description: description.trim() || category,
      type: "expense",
    });
    setAmount(""); setDescription(""); setOpen(false);
    onAdd();
  };

  const todayTotal = transactions
    .filter(t => t.date === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
        >
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Log Expense</p>
            <p style={{ color: "#a1a1aa", fontSize: "12px", marginTop: "2px" }}>Today: ${todayTotal.toFixed(2)}</p>
          </div>
          <span style={{ color: "#52525b", fontSize: "18px" }}>{open ? "×" : "+"}</span>
        </button>
        {open && (
          <div style={{ padding: "0 20px 20px", borderTop: "1px solid #27272a", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              placeholder="Amount ($)"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ marginTop: "12px", width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "none",
                    background: category === c ? "white" : "#27272a",
                    color: category === c ? "black" : "#71717a",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
            >
              Log Expense
            </button>
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
          {transactions.slice(0, 10).map((t, i) => (
            <div key={t.id} style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < Math.min(transactions.length, 10) - 1 ? "1px solid #27272a" : "none" }}>
              <div>
                <p style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>{t.description}</p>
                <p style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>{t.category} · {t.date}</p>
              </div>
              <p style={{ color: "#f87171", fontSize: "14px", fontWeight: 600 }}>-${t.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
