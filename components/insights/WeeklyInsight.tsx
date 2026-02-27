"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const CACHE_KEY = "lifeos_weekly_insight";
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export default function WeeklyInsight() {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { insight, generatedAt, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setInsight(insight);
          setGeneratedAt(generatedAt);
        }
      }
    } catch {}
  }, []);

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
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setInsight(data.insight);
      setGeneratedAt(data.generatedAt);
      setExpanded(true);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        insight: data.insight, generatedAt: data.generatedAt, timestamp: Date.now(),
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>AI Coach</p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "white", marginTop: "4px" }}>Weekly Insight</p>
        </div>
        {generatedAt && <p style={{ fontSize: "10px", color: "#3f3f46" }}>{timeAgo(generatedAt)}</p>}
      </div>

      {insight ? (
        <div>
          <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.7", overflow: expanded ? "visible" : "hidden", display: expanded ? "block" : "-webkit-box", WebkitLineClamp: expanded ? "unset" : 3, WebkitBoxOrient: "vertical" as any }}>
            {insight}
          </p>
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: "8px", padding: 0 }}>
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        </div>
      ) : (
        <p style={{ color: "#52525b", fontSize: "13px", lineHeight: "1.6" }}>
          Get a personalized analysis of your week — what's working, what to improve, and concrete tips.
        </p>
      )}

      {error && <p style={{ color: "#f87171", fontSize: "12px" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{
        width: "100%", padding: "14px", borderRadius: "14px",
        background: loading ? "#27272a" : insight ? "none" : "white",
        border: insight ? "1px solid #27272a" : "none",
        color: loading ? "#52525b" : insight ? "#71717a" : "black",
        fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em",
        textTransform: "uppercase" as const, cursor: loading ? "default" : "pointer",
      }}>
        {loading ? "Analyzing your week..." : insight ? "Refresh Insight" : "✨ Generate Insight"}
      </button>
    </div>
  );
}
