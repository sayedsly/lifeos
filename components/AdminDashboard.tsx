"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

interface UserUsage {
  id: string;
  email: string;
  totalCalls: number;
  todayCalls: number;
  weekCalls: number;
  monthCalls: number;
  totalCostCents: number;
  weekCostCents: number;
  monthCostCents: number;
  lastQuery: string;
  lastDate: string;
}

type Period = "today" | "week" | "month" | "all";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("today");

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetUser = async (userId: string) => {
    setResetting(userId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId }),
    });
    await load();
    setResetting(null);
  };

  const getCalls = (u: UserUsage) => {
    if (period === "today") return u.todayCalls;
    if (period === "week") return u.weekCalls;
    if (period === "month") return u.monthCalls;
    return u.totalCalls;
  };

  const getCost = (u: UserUsage) => {
    if (period === "week") return u.weekCostCents;
    if (period === "month") return u.monthCostCents;
    if (period === "today") return u.totalCostCents / Math.max(u.totalCalls, 1) * u.todayCalls;
    return u.totalCostCents;
  };

  const totalCalls = users.reduce((a, u) => a + getCalls(u), 0);
  const totalCost = users.reduce((a, u) => a + getCost(u), 0);
  const activeUsers = users.filter(u => getCalls(u) > 0).length;

  const LIMIT = 30;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius: "20px", padding: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🔐</div>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Owner Dashboard</p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: "white" }}>AI Usage Analytics</p>
        </div>
      </div>

      {/* Period toggle */}
      <div style={{ display: "flex", gap: "3px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {(["today", "week", "month", "all"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ flex: 1, padding: "8px", borderRadius: "12px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 700, textTransform: "capitalize",
              background: period === p ? "#111118" : "transparent", color: period === p ? "white" : "#9ca3af" }}>
            {p === "all" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "AI Calls", value: totalCalls, emoji: "🤖", color: "#6366f1" },
          { label: "Active Users", value: activeUsers, emoji: "👥", color: "#22c55e" },
          { label: "Est. Cost", value: `$${(totalCost / 100).toFixed(3)}`, emoji: "💸", color: "#f59e0b" },
        ].map(({ label, value, emoji, color }) => (
          <div key={label} style={{ background: "white", borderRadius: "16px", padding: "14px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" as const }}>
            <p style={{ fontSize: "18px", marginBottom: "4px" }}>{emoji}</p>
            <p style={{ fontSize: "20px", fontWeight: 900, color }}>{value}</p>
            <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Per user */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", padding: "0 4px" }}>
          {users.length} Users
        </p>
        {users.sort((a, b) => getCalls(b) - getCalls(a)).map(u => {
          const calls = getCalls(u);
          const cost = getCost(u);
          const pct = Math.min(calls / LIMIT, 1);
          const isHigh = calls >= 25;
          const isMaxed = calls >= LIMIT;
          return (
            <div key={u.id} style={{ background: "white", borderRadius: "18px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: isMaxed ? "2px solid #fca5a5" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ flex: 1, marginRight: "10px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{u.email}</p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>Today: {u.todayCalls}</span>
                    <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>Week: {u.weekCalls}</span>
                    <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>Month: {u.monthCalls}</span>
                    <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700 }}>~${(u.totalCostCents / 100).toFixed(3)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <p style={{ fontSize: "20px", fontWeight: 900, color: isMaxed ? "#ef4444" : isHigh ? "#f59e0b" : "#111118" }}>
                    {calls}<span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>{period === "today" ? "/30" : ""}</span>
                  </p>
                  {isMaxed && <p style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}>MAXED</p>}
                </div>
              </div>

              {period === "today" && (
                <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: isMaxed ? "#ef4444" : isHigh ? "#f59e0b" : "#6366f1", borderRadius: "999px" }} />
                </div>
              )}

              {u.lastQuery && (
                <div style={{ background: "#f7f8fc", borderRadius: "10px", padding: "8px 10px", marginBottom: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>Last query · {u.lastDate}</p>
                  <p style={{ fontSize: "11px", color: "#374151", fontWeight: 600, fontStyle: "italic" }}>"{u.lastQuery.slice(0, 100)}{u.lastQuery.length > 100 ? "..." : ""}"</p>
                </div>
              )}

              <button onClick={() => resetUser(u.id)} disabled={resetting === u.id || u.todayCalls === 0}
                style={{ padding: "7px 14px", background: u.todayCalls > 0 ? "#fef2f2" : "#f7f8fc", border: "none", borderRadius: "10px", color: u.todayCalls > 0 ? "#ef4444" : "#9ca3af", fontWeight: 700, fontSize: "11px", cursor: u.todayCalls > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
                {resetting === u.id ? "Resetting..." : "Reset Today's Limit"}
              </button>
            </div>
          );
        })}

        {users.length === 0 && (
          <div style={{ background: "white", borderRadius: "18px", padding: "40px 20px", textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>🤖</p>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>No AI usage yet</p>
          </div>
        )}
      </div>
    </div>
  );
}