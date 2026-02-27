"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

interface Profile { id: string; username: string; }
interface Friendship { id: string; requester_id: string; addressee_id: string; status: string; otherUser: Profile; }
interface Badge { emoji: string; label: string; }
interface LeaderboardEntry { username: string; score: number; userId: string; badges: Badge[]; }

type Period = "today" | "week" | "month";

async function computeBadges(userId: string, friendIds: string[]): Promise<Record<string, Badge[]>> {
  const allIds = [...friendIds, userId];
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const { data: snapshots } = await supabase
    .from("momentum_snapshots")
    .select("user_id, date, score, breakdown")
    .in("user_id", allIds)
    .gte("date", since);

  const { data: workouts } = await supabase
    .from("workout_sessions")
    .select("user_id, date, completed")
    .in("user_id", allIds)
    .gte("date", weekAgo);

  const { data: sleepData } = await supabase
    .from("sleep_entries")
    .select("user_id, date, duration")
    .in("user_id", allIds)
    .gte("date", weekAgo);

  const { data: hydrationData } = await supabase
    .from("hydration_entries")
    .select("user_id, date, amount")
    .in("user_id", allIds)
    .gte("date", weekAgo);

  const { data: stepData } = await supabase
    .from("step_entries")
    .select("user_id, date, count")
    .in("user_id", allIds)
    .gte("date", weekAgo);

  // Get settings for goals (use a simple default)
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("user_id, hydration_goal, sleep_goal, step_goal")
    .in("user_id", allIds);

  const settingsMap: Record<string, any> = {};
  (settingsData || []).forEach(s => { settingsMap[s.user_id] = s; });

  const badgeMap: Record<string, Badge[]> = {};

  for (const uid of allIds) {
    const badges: Badge[] = [];
    const userSnaps = (snapshots || []).filter(s => s.user_id === uid);
    const weekSnaps = userSnaps.filter(s => s.date >= weekAgo);
    const userWorkouts = (workouts || []).filter(w => w.user_id === uid && w.completed);
    const userSleep = (sleepData || []).filter(s => s.user_id === uid);
    const userHydration = (hydrationData || []).filter(h => h.user_id === uid);
    const userSteps = (stepData || []).filter(s => s.user_id === uid);
    const settings = settingsMap[uid] || { hydration_goal: 2500, sleep_goal: 8, step_goal: 10000 };

    // 🔥 On Fire — 7 day streak
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (userSnaps.find(s => s.date === d && s.score > 0)) streak++;
      else break;
    }
    if (streak >= 7) badges.push({ emoji: "🔥", label: "On Fire" });

    // ⚡ Consistent — logged every day this week
    const loggedDays = new Set(weekSnaps.filter(s => s.score > 0).map(s => s.date)).size;
    if (loggedDays >= 7) badges.push({ emoji: "⚡", label: "Consistent" });

    // 💪 Iron — 3+ workouts this week
    if (userWorkouts.filter(w => w.date >= weekAgo).length >= 3) badges.push({ emoji: "💪", label: "Iron" });

    // 😴 Sleep King — hit sleep goal 5+ days
    const sleepGoalHits = userSleep.filter(s => s.duration >= settings.sleep_goal).length;
    if (sleepGoalHits >= 5) badges.push({ emoji: "😴", label: "Sleep King" });

    // 💧 Hydration Hero — hit water goal 5+ days
    const hydByDay: Record<string, number> = {};
    userHydration.forEach(h => { hydByDay[h.date] = (hydByDay[h.date] || 0) + h.amount; });
    const hydGoalHits = Object.values(hydByDay).filter(v => v >= settings.hydration_goal).length;
    if (hydGoalHits >= 5) badges.push({ emoji: "💧", label: "Hydration Hero" });

    // 👟 Step Master — hit step goal 5+ days
    const stepGoalHits = userSteps.filter(s => s.count >= settings.step_goal).length;
    if (stepGoalHits >= 5) badges.push({ emoji: "👟", label: "Step Master" });

    // 🥗 Clean Eater — nutrition score > 80% of max 5+ days
    const nutritionHits = weekSnaps.filter(s => (s.breakdown?.nutrition || 0) >= 24).length;
    if (nutritionHits >= 5) badges.push({ emoji: "🥗", label: "Clean Eater" });

    // 🏆 Top Score — highest single day this week among all users
    const myBest = Math.max(...weekSnaps.map(s => s.score), 0);
    const globalBest = Math.max(...(snapshots || []).filter(s => s.date >= weekAgo).map(s => s.score), 0);
    if (myBest > 0 && myBest === globalBest) badges.push({ emoji: "🏆", label: "Top Score" });

    badgeMap[uid] = badges;
  }

  return badgeMap;
}

export default function FriendsPage() {
  const [myId, setMyId] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<"leaderboard" | "friends" | "add">("leaderboard");
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setMyId(data.user.id);
      loadAll(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (myId) loadLeaderboard(myId, friends, period);
  }, [period]);

  const loadAll = async (uid: string) => {
    setLoading(true);
    try {
      const { data: sent } = await supabase.from("friendships").select("*").eq("requester_id", uid);
      const { data: received } = await supabase.from("friendships").select("*").eq("addressee_id", uid);
      const allFriendships = [...(sent || []), ...(received || [])];

      const otherIds = allFriendships.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
      let profileMap: Record<string, Profile> = {};
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", otherIds);
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
      }

      const withProfiles = allFriendships.map(f => ({
        ...f,
        otherUser: profileMap[f.requester_id === uid ? f.addressee_id : f.requester_id] || { id: "", username: "Unknown" },
      }));

      const acceptedFriends = withProfiles.filter(f => f.status === "accepted");
      const pendingIncoming = withProfiles.filter(f => f.status === "pending" && f.addressee_id === uid);
      setFriends(acceptedFriends);
      setPending(pendingIncoming);
      await loadLeaderboard(uid, acceptedFriends, period, profileMap);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (uid: string, acceptedFriends: Friendship[], p: Period, profileMap?: Record<string, Profile>) => {
    const friendIds = acceptedFriends.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
    const allIds = [...friendIds, uid];

    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const monthAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

    const since = p === "today" ? today : p === "week" ? weekAgo : monthAgo;

    const { data: scores } = await supabase
      .from("momentum_snapshots")
      .select("user_id, score, date")
      .in("user_id", allIds)
      .gte("date", since);

    const { data: myProfile } = await supabase.from("profiles").select("username").eq("id", uid).single();

    // Compute average or today score per user
    const scoresByUser: Record<string, number[]> = {};
    (scores || []).forEach(s => {
      if (!scoresByUser[s.user_id]) scoresByUser[s.user_id] = [];
      scoresByUser[s.user_id].push(s.score);
    });

    const badges = await computeBadges(uid, friendIds);

    // Build entries
    const entries: LeaderboardEntry[] = allIds.map(id => {
      const userScores = scoresByUser[id] || [];
      const score = p === "today"
        ? (userScores[0] || 0)
        : userScores.length > 0 ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length) : 0;

      let username = "Unknown";
      if (id === uid) username = myProfile?.username || "You";
      else if (profileMap) username = profileMap[id]?.username || "Unknown";
      else username = acceptedFriends.find(f => f.otherUser.id === id)?.otherUser.username || "Unknown";

      return { userId: id, username, score, badges: badges[id] || [] };
    }).sort((a, b) => b.score - a.score);

    setLeaderboard(entries);
  };

  const searchUsers = async () => {
    if (!search.trim()) return;
    const { data } = await supabase.from("profiles").select("id, username").ilike("username", `%${search}%`).neq("id", myId).limit(10);
    setSearchResults(data || []);
  };

  const sendRequest = async (addresseeId: string) => {
    const { error } = await supabase.from("friendships").insert({ requester_id: myId, addressee_id: addresseeId, status: "pending" });
    if (!error) { setRequestSent(prev => [...prev, addresseeId]); setSearchResults(prev => prev.filter(p => p.id !== addresseeId)); }
  };

  const acceptRequest = async (friendshipId: string) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId); loadAll(myId); };
  const declineRequest = async (friendshipId: string) => { await supabase.from("friendships").delete().eq("id", friendshipId); loadAll(myId); };

  const medals = ["🥇", "🥈", "🥉"];

  const tabBtn = (t: typeof tab, label: string, count?: number) => (
    <button onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b" }}>
      {label}{count ? ` (${count})` : ""}
    </button>
  );

  const periodBtn = (p: Period, label: string) => (
    <button onClick={() => setPeriod(p)} style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: period === p ? "#27272a" : "transparent", color: period === p ? "white" : "#52525b" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Social</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>Friends</p>
      </div>

      {pending.length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #f59e0b", borderRadius: "24px", overflow: "hidden" }}>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", padding: "16px 20px 8px" }}>
            {pending.length} Friend Request{pending.length > 1 ? "s" : ""}
          </p>
          {pending.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #27272a", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>{f.otherUser.username?.[0]?.toUpperCase()}</p>
              </div>
              <p style={{ flex: 1, color: "white", fontWeight: 600, fontSize: "14px" }}>{f.otherUser.username}</p>
              <button onClick={() => declineRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "10px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>Decline</button>
              <button onClick={() => acceptRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>Accept</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "4px" }}>
        {tabBtn("leaderboard", "Board")}
        {tabBtn("friends", "Friends", friends.length || undefined)}
        {tabBtn("add", "Add")}
      </div>

      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Period selector */}
          <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "4px" }}>
            {periodBtn("today", "Today")}
            {periodBtn("week", "This Week")}
            {periodBtn("month", "This Month")}
          </div>

          <p style={{ fontSize: "10px", color: "#52525b", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {period === "today" ? "Today's score" : period === "week" ? "7-day average" : "30-day average"}
          </p>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No scores yet</p>
              <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Add friends and log your data to compete</p>
            </div>
          ) : (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === myId;
                return (
                  <div key={entry.userId} style={{ padding: "16px 20px", background: isMe ? "#27272a" : "transparent", borderBottom: i < leaderboard.length - 1 ? "1px solid #27272a" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <p style={{ fontSize: i < 3 ? "20px" : "13px", width: "28px", textAlign: "center", color: "#52525b", fontWeight: 700 }}>
                        {i < 3 ? medals[i] : i + 1}
                      </p>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: isMe ? "white" : "#a1a1aa", fontWeight: 600, fontSize: "14px" }}>
                          {entry.username} {isMe && <span style={{ color: "#52525b", fontSize: "11px" }}>(you)</span>}
                        </p>
                        {entry.badges.length > 0 && (
                          <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" as const }}>
                            {entry.badges.map((b, bi) => (
                              <span key={bi} title={b.label} style={{ fontSize: "14px", lineHeight: 1 }}>{b.emoji}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: "28px", fontWeight: 700, color: isMe ? "white" : "#71717a" }}>{entry.score}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Badge legend */}
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "16px 20px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "12px" }}>Badges</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { emoji: "🔥", label: "On Fire", desc: "7-day streak" },
                { emoji: "⚡", label: "Consistent", desc: "Logged all 7 days" },
                { emoji: "💪", label: "Iron", desc: "3+ workouts/week" },
                { emoji: "😴", label: "Sleep King", desc: "Hit sleep goal 5x" },
                { emoji: "💧", label: "Hydration Hero", desc: "Hit water goal 5x" },
                { emoji: "👟", label: "Step Master", desc: "Hit step goal 5x" },
                { emoji: "🥗", label: "Clean Eater", desc: "Hit nutrition 5x" },
                { emoji: "🏆", label: "Top Score", desc: "Best day this week" },
              ].map(({ emoji, label, desc }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>{emoji}</span>
                  <div>
                    <p style={{ color: "white", fontSize: "11px", fontWeight: 600 }}>{label}</p>
                    <p style={{ color: "#52525b", fontSize: "10px" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "friends" && (
        friends.length === 0 ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No friends yet</p>
          </div>
        ) : (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
            {friends.map((f, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < friends.length - 1 ? "1px solid #27272a" : "none" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px" }}>
                  <p style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>{f.otherUser.username?.[0]?.toUpperCase()}</p>
                </div>
                <p style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>{f.otherUser.username}</p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "add" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchUsers()}
              style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "14px 16px", color: "white", fontSize: "14px", outline: "none" }} />
            <button onClick={searchUsers} style={{ padding: "14px 20px", borderRadius: "14px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", border: "none", cursor: "pointer" }}>Search</button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
              {searchResults.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < searchResults.length - 1 ? "1px solid #27272a" : "none" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px" }}>
                    <p style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>{p.username?.[0]?.toUpperCase()}</p>
                  </div>
                  <p style={{ flex: 1, color: "white", fontWeight: 600, fontSize: "14px" }}>{p.username}</p>
                  <button onClick={() => sendRequest(p.id)} disabled={requestSent.includes(p.id)}
                    style={{ padding: "8px 16px", borderRadius: "10px", background: requestSent.includes(p.id) ? "#27272a" : "white", border: "none", color: requestSent.includes(p.id) ? "#52525b" : "black", fontWeight: 700, fontSize: "11px", cursor: requestSent.includes(p.id) ? "default" : "pointer" }}>
                    {requestSent.includes(p.id) ? "Sent ✓" : "Add"}
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
