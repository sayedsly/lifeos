"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface UserUsage {
  id: string;
  email: string;
  totalCalls: number;
  todayCalls: number;
  totalCostCents: number;
  lastQuery: string;
  lastDate: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
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

  const totalCost = users.reduce((a, u) => a + u.totalCostCents, 0);
  const totalCalls = users.reduce((a, u) => a + u.totalCalls, 0);
  const totalToday = users.reduce((a, u) => a + u.todayCalls, 0);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ padding: "0 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>Owner Only</p>
        <p style={{ fontSize: "24px", fontWeight: 900, color: "#111118" }}>AI Usage Dashboard</p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Total Calls", value: totalCalls, emoji: "🤖" },
          { label: "Today", value: totalToday, emoji: "📅" },
          { label: "Est. Cost", value: `$${(totalCost / 100).toFixed(3)}`, emoji: "💸" },
        ].map(({ label, value, emoji }) => (
          <div key={label} style={{ background: "white", borderRadius: "16px", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" as const }}>
            <p style={{ fontSize: "20px", marginBottom: "4px" }}>{emoji}</p>
            <p style={{ fontSize: "18px", fontWeight: 900, color: "#111118" }}>{value}</p>
            <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Per user */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {users.sort((a, b) => b.todayCalls - a.todayCalls).map(u => {
          const pct = Math.min(u.todayCalls / 30, 1);
          const isHigh = u.todayCalls >= 25;
          return (
            <div key={u.id} style={{ background: "white", borderRadius: "18px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{u.email}</p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, marginTop: "2px" }}>
                    {u.totalCalls} total calls · ${(u.totalCostCents / 100).toFixed(3)} est.
                  </p>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: isHigh ? "#ef4444" : "#111118" }}>{u.todayCalls}<span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>/30</span></p>
                  <p style={{ fontSize: "9px", color: "#9ca3af", fontWeight: 600 }}>today</p>
                </div>
              </div>

              {/* Usage bar */}
              <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "10px" }}>
                <div style={{ width: `${pct * 100}%`, height: "100%", background: isHigh ? "#ef4444" : "#6366f1", borderRadius: "999px", transition: "width 0.5s" }} />
              </div>

              {u.lastQuery && (
                <p style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic", marginBottom: "10px", background: "#f7f8fc", borderRadius: "8px", padding: "6px 10px" }}>
                  Last: "{u.lastQuery.slice(0, 80)}{u.lastQuery.length > 80 ? "..." : ""}"
                </p>
              )}

              <button onClick={() => resetUser(u.id)} disabled={resetting === u.id || u.todayCalls === 0}
                style={{ padding: "7px 14px", background: u.todayCalls > 0 ? "#fef2f2" : "#f7f8fc", border: "none", borderRadius: "10px", color: u.todayCalls > 0 ? "#ef4444" : "#9ca3af", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                {resetting === u.id ? "Resetting..." : "Reset Today's Limit"}
              </button>
            </div>
          );
        })}

        {users.length === 0 && (
          <div style={{ background: "white", borderRadius: "18px", padding: "32px 20px", textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>🤖</p>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>No AI usage yet</p>
          </div>
        )}
      </div>
    </div>
  );
}