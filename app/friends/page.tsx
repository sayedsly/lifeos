"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";

interface Profile { id: string; username: string; }
interface Friendship { id: string; requester_id: string; addressee_id: string; status: string; profiles: Profile; }
interface LeaderboardEntry { username: string; score: number; userId: string; }

export default function FriendsPage() {
  const [myId, setMyId] = useState("");
  const [myUsername, setMyUsername] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<"leaderboard" | "friends" | "add">("leaderboard");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setMyId(data.user.id);
      supabase.from("profiles").select("username").eq("id", data.user.id).single()
        .then(({ data: p }) => { if (p) setMyUsername(p.username); });
      loadFriends(data.user.id);
    });
  }, []);

  const loadFriends = async (uid: string) => {
    const { data } = await supabase
      .from("friendships")
      .select("*, profiles!friendships_addressee_id_fkey(id, username)")
      .eq("requester_id", uid);

    const { data: incoming } = await supabase
      .from("friendships")
      .select("*, profiles!friendships_requester_id_fkey(id, username)")
      .eq("addressee_id", uid)
      .eq("status", "pending");

    const accepted = (data || []).filter((f: any) => f.status === "accepted");
    setFriends(accepted);
    setPending(incoming || []);

    // Load friend leaderboard
    const friendIds = accepted.map((f: any) => f.addressee_id);
    if (friendIds.length > 0) {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: scores } = await supabase
        .from("momentum_snapshots")
        .select("user_id, score, profiles(username)")
        .in("user_id", [...friendIds, uid])
        .eq("date", today);

      const entries = (scores || []).map((s: any) => ({
        userId: s.user_id,
        username: s.profiles?.username || "Unknown",
        score: s.score,
      })).sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score);
      setLeaderboard(entries);
    }
  };

  const searchUsers = async () => {
    if (!search.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${search}%`)
      .neq("id", myId)
      .limit(10);
    setSearchResults(data || []);
  };

  const sendRequest = async (addresseeId: string) => {
    await supabase.from("friendships").insert({ requester_id: myId, addressee_id: addresseeId, status: "pending" });
    setSearchResults(prev => prev.filter(p => p.id !== addresseeId));
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadFriends(myId);
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadFriends(myId);
  };

  const medals = ["🥇", "🥈", "🥉"];

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
      background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Friends</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{myUsername}</p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", padding: "16px 20px 8px" }}>
            {pending.length} Friend Request{pending.length > 1 ? "s" : ""}
          </p>
          {pending.map((f: any) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #27272a", gap: "12px" }}>
              <p style={{ flex: 1, color: "white", fontWeight: 600, fontSize: "14px" }}>{f.profiles?.username}</p>
              <button onClick={() => declineRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "10px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>Decline</button>
              <button onClick={() => acceptRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>Accept</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "4px" }}>
        {tabBtn("leaderboard", "Board")}
        {tabBtn("friends", `Friends ${friends.length > 0 ? `(${friends.length})` : ""}`)}
        {tabBtn("add", "Add")}
      </div>

      {/* Leaderboard tab */}
      {tab === "leaderboard" && (
        leaderboard.length === 0 ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Add friends to see leaderboard</p>
          </div>
        ) : (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            {leaderboard.map((entry, i) => {
              const isMe = entry.userId === myId;
              return (
                <div key={entry.userId} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", background: isMe ? "#27272a" : "transparent", borderBottom: i < leaderboard.length - 1 ? "1px solid #27272a" : "none" }}>
                  <p style={{ fontSize: i < 3 ? "18px" : "13px", width: "24px", textAlign: "center", color: "#52525b", fontWeight: 700 }}>{i < 3 ? medals[i] : i + 1}</p>
                  <p style={{ flex: 1, color: isMe ? "white" : "#a1a1aa", fontWeight: 600, fontSize: "14px" }}>
                    {entry.username} {isMe && <span style={{ color: "#52525b", fontSize: "11px" }}>(you)</span>}
                  </p>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: isMe ? "white" : "#71717a" }}>{entry.score}</p>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Friends list tab */}
      {tab === "friends" && (
        friends.length === 0 ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No friends yet</p>
            <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Search by username to add friends</p>
          </div>
        ) : (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            {friends.map((f: any, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < friends.length - 1 ? "1px solid #27272a" : "none" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px" }}>
                  <p style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>{f.profiles?.username?.[0]?.toUpperCase()}</p>
                </div>
                <p style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>{f.profiles?.username}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add friends tab */}
      {tab === "add" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              placeholder="Search by username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchUsers()}
              style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "14px 16px", color: "white", fontSize: "14px", outline: "none" }}
            />
            <button onClick={searchUsers} style={{ padding: "14px 20px", borderRadius: "14px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", border: "none", cursor: "pointer" }}>
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
              {searchResults.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < searchResults.length - 1 ? "1px solid #27272a" : "none" }}>
                  <p style={{ flex: 1, color: "white", fontWeight: 600, fontSize: "14px" }}>{p.username}</p>
                  <button onClick={() => sendRequest(p.id)} style={{ padding: "8px 16px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
