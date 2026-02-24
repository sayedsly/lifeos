"use client";
import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";

interface Entry {
  username: string;
  score: number;
  date: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myUsername, setMyUsername] = useState("");
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    getLeaderboard().then(setEntries);
    if (user) {
      supabase.from("profiles").select("username").eq("id", user.id).single()
        .then(({ data }) => { if (data) setMyUsername(data.username); });
    }
  }, [user]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Leaderboard</p>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "MMMM d")}</p>
        </div>
        <button
          onClick={signOut}
          style={{ fontSize: "10px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "16px 20px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Signed in as</p>
        <p style={{ color: "white", fontWeight: 600 }}>{myUsername || "..."}</p>
      </div>

      {entries.length === 0 ? (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No scores today yet</p>
          <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Log data to appear on the board</p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Today's Rankings</p>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            {entries.map((entry, i) => {
              const isMe = entry.username === myUsername;
              return (
                <div
                  key={entry.username}
                  style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "16px 20px",
                    background: isMe ? "#27272a" : "transparent",
                    borderBottom: i < entries.length - 1 ? "1px solid #27272a" : "none",
                  }}
                >
                  <p style={{ fontSize: i < 3 ? "18px" : "13px", width: "24px", textAlign: "center", color: "#52525b", fontWeight: 700 }}>
                    {i < 3 ? medals[i] : i + 1}
                  </p>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: isMe ? "white" : "#a1a1aa", fontWeight: 600, fontSize: "14px" }}>
                      {entry.username} {isMe && <span style={{ color: "#52525b", fontSize: "11px" }}>(you)</span>}
                    </p>
                  </div>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: isMe ? "white" : "#71717a" }}>
                    {entry.score}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
