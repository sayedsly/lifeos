"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Props { name?: string; }

export default function InsightsCard({ name }: Props) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, accessToken: session.access_token }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInsight(data.insight);
      setGeneratedAt(data.generatedAt);
    } catch (e: any) {
      setError(e.message || "Failed to generate insight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: "28px", padding: "22px 20px", boxShadow: "0 8px 32px rgba(99,102,241,0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "12px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
          ✨
        </div>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em" }}>AI Coach</p>
          <p style={{ fontSize: "15px", fontWeight: 800, color: "white" }}>Weekly Insight</p>
        </div>
      </div>

      {!insight && !loading && (
        <>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: 600, lineHeight: 1.6, marginBottom: "16px" }}>
            Get a personalized analysis of your week — sleep, nutrition, steps, workouts and more.
          </p>
          <button onClick={generate}
            style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: "16px", color: "white", fontWeight: 800, fontSize: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
            className="btn-press">
            Generate My Insight →
          </button>
        </>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "16px 0" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Analyzing your week...</p>
          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-6px);opacity:1} }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.15)", borderRadius: "12px", padding: "12px 14px", marginBottom: "12px" }}>
          <p style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {insight && (
        <>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", marginBottom: "14px" }}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: 500, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{insight}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {generatedAt && (
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <button onClick={generate} disabled={loading}
              style={{ padding: "7px 14px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "10px", color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Refresh ↺
            </button>
          </div>
        </>
      )}
    </div>
  );
}