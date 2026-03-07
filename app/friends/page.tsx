"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

interface Profile { id: string; username: string; }
interface Friendship { id: string; requester_id: string; addressee_id: string; status: string; otherUser: Profile; }
interface Badge { emoji: string; label: string; }
interface RingData { nutrition: number; hydration: number; steps: number; sleep: number; workout: number; }
interface LeaderboardEntry { username: string; score: number; userId: string; badges: Badge[]; rings: RingData; }
interface Challenge { id: string; creator_id: string; title: string; type: string; goal: number; start_date: string; end_date: string; participants: string[]; progress: Record<string, number>; creatorName: string; }
type Period = "today" | "week" | "month";
type Tab = "leaderboard" | "friends" | "challenges" | "add";

const BASE_URL = "https://lifeos-iota-wine.vercel.app";

function ActivityRings({ rings, size = 36 }: { rings: RingData; size?: number }) {
  const domains = [
    { key: "nutrition", color: "#f97316", pct: rings.nutrition },
    { key: "hydration", color: "#3b82f6", pct: rings.hydration },
    { key: "steps", color: "#22c55e", pct: rings.steps },
    { key: "sleep", color: "#a78bfa", pct: rings.sleep },
    { key: "workout", color: "#f43f5e", pct: rings.workout },
  ];
  const cx = size / 2, cy = size / 2;
  const rings_count = domains.length;
  const trackW = size * 0.065;
  const gap = size * 0.01;
  const outerR = (size / 2) - trackW / 2 - 1;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {domains.map((d, i) => {
        const r = outerR - i * (trackW + gap);
        const circ = 2 * Math.PI * r;
        const dash = Math.min(d.pct / 100, 1) * circ;
        return (
          <g key={d.key}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={trackW} strokeOpacity={0.15} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={trackW}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`} />
          </g>
        );
      })}
    </svg>
  );
}

async function computeRings(userId: string, allIds: string[], today: string, weekAgo: string): Promise<Record<string, RingData>> {
  const [{ data: nutrition }, { data: hydration }, { data: steps }, { data: sleep }, { data: workouts }, { data: settings }] = await Promise.all([
    supabase.from("nutrition_entries").select("user_id,date,calories").in("user_id", allIds).eq("date", today),
    supabase.from("hydration_entries").select("user_id,date,amount").in("user_id", allIds).eq("date", today),
    supabase.from("step_entries").select("user_id,date,count").in("user_id", allIds).eq("date", today),
    supabase.from("sleep_entries").select("user_id,date,duration").in("user_id", allIds).eq("date", today),
    supabase.from("workout_sessions").select("user_id,date,completed").in("user_id", allIds).eq("date", today),
    supabase.from("user_settings").select("user_id,macro_targets,hydration_goal,step_goal,sleep_goal").in("user_id", allIds),
  ]);
  const sm: Record<string, any> = {};
  (settings || []).forEach((s: any) => sm[s.user_id] = s);

  const result: Record<string, RingData> = {};
  for (const uid of allIds) {
    const s = sm[uid] || {};
    const calGoal = s.macro_targets?.calories || 2000;
    const hydGoal = s.hydration_goal || 2500;
    const stepGoal = s.step_goal || 10000;
    const sleepGoal = s.sleep_goal || 8;

    const cals = (nutrition || []).filter((n: any) => n.user_id === uid).reduce((a: number, n: any) => a + (n.calories || 0), 0);
    const hyd = (hydration || []).filter((h: any) => h.user_id === uid).reduce((a: number, h: any) => a + (h.amount || 0), 0);
    const stps = (steps || []).find((s: any) => s.user_id === uid)?.count || 0;
    const slp = (sleep || []).find((s: any) => s.user_id === uid)?.duration || 0;
    const wkt = (workouts || []).some((w: any) => w.user_id === uid && w.completed) ? 100 : 0;

    result[uid] = {
      nutrition: Math.min((cals / calGoal) * 100, 100),
      hydration: Math.min((hyd / hydGoal) * 100, 100),
      steps: Math.min((stps / stepGoal) * 100, 100),
      sleep: Math.min((slp / sleepGoal) * 100, 100),
      workout: wkt,
    };
  }
  return result;
}

async function computeBadges(userId: string, friendIds: string[]): Promise<Record<string, Badge[]>> {
  const allIds = [...friendIds, userId];
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const [{ data: snapshots }, { data: workouts }, { data: sleepData }, { data: hydrationData }, { data: stepData }, { data: settingsData }] = await Promise.all([
    supabase.from("momentum_snapshots").select("user_id,date,score,breakdown").in("user_id", allIds).gte("date", since),
    supabase.from("workout_sessions").select("user_id,date,completed").in("user_id", allIds).gte("date", weekAgo),
    supabase.from("sleep_entries").select("user_id,date,duration").in("user_id", allIds).gte("date", weekAgo),
    supabase.from("hydration_entries").select("user_id,date,amount").in("user_id", allIds).gte("date", weekAgo),
    supabase.from("step_entries").select("user_id,date,count").in("user_id", allIds).gte("date", weekAgo),
    supabase.from("user_settings").select("user_id,hydration_goal,sleep_goal,step_goal").in("user_id", allIds),
  ]);
  const settingsMap: Record<string, any> = {};
  (settingsData || []).forEach((s: any) => { settingsMap[s.user_id] = s; });
  const badgeMap: Record<string, Badge[]> = {};
  for (const uid of allIds) {
    const badges: Badge[] = [];
    const userSnaps = (snapshots || []).filter((s: any) => s.user_id === uid);
    const weekSnaps = userSnaps.filter((s: any) => s.date >= weekAgo);
    const userWorkouts = (workouts || []).filter((w: any) => w.user_id === uid && w.completed);
    const userSleep = (sleepData || []).filter((s: any) => s.user_id === uid);
    const userHydration = (hydrationData || []).filter((h: any) => h.user_id === uid);
    const userSteps = (stepData || []).filter((s: any) => s.user_id === uid);
    const settings = settingsMap[uid] || { hydration_goal: 2500, sleep_goal: 8, step_goal: 10000 };
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (userSnaps.find((s: any) => s.date === d && s.score > 0)) streak++; else break;
    }
    if (streak >= 7) badges.push({ emoji: "🔥", label: "On Fire" });
    if (new Set(weekSnaps.filter((s: any) => s.score > 0).map((s: any) => s.date)).size >= 7) badges.push({ emoji: "⚡", label: "Consistent" });
    if (userWorkouts.filter((w: any) => w.date >= weekAgo).length >= 3) badges.push({ emoji: "💪", label: "Iron" });
    if (userSleep.filter((s: any) => s.duration >= settings.sleep_goal).length >= 5) badges.push({ emoji: "😴", label: "Sleep King" });
    const hydByDay: Record<string, number> = {};
    userHydration.forEach((h: any) => { hydByDay[h.date] = (hydByDay[h.date] || 0) + h.amount; });
    if (Object.values(hydByDay).filter((v: any) => v >= settings.hydration_goal).length >= 5) badges.push({ emoji: "💧", label: "Hydration Hero" });
    if (userSteps.filter((s: any) => s.count >= settings.step_goal).length >= 5) badges.push({ emoji: "👟", label: "Step Master" });
    if (weekSnaps.filter((s: any) => (s.breakdown?.nutrition || 0) >= 24).length >= 5) badges.push({ emoji: "🥗", label: "Clean Eater" });
    const myBest = Math.max(...weekSnaps.map((s: any) => s.score), 0);
    const globalBest = Math.max(...(snapshots || []).filter((s: any) => s.date >= weekAgo).map((s: any) => s.score), 0);
    if (myBest > 0 && myBest === globalBest) badges.push({ emoji: "🏆", label: "Top Score" });
    badgeMap[uid] = badges;
  }
  return badgeMap;
}

export default function FriendsPage() {
  const [myId, setMyId] = useState("");
  const [myUsername, setMyUsername] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<string[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ title: "", type: "steps", goal: "", days: "7" });
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setMyId(data.user.id);
      loadAll(data.user.id);
    });
  }, []);

  useEffect(() => { if (myId) loadLeaderboard(myId, friends, period); }, [period]);

  const generateInviteLink = async () => {
    const code = Math.random().toString(36).slice(2, 10);
    const { error } = await supabase.from("friend_invites").insert({
      id: Math.random().toString(36).slice(2),
      inviter_id: myId,
      code,
    });
    if (!error) setInviteCode(code);
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(`${BASE_URL}/invite/${inviteCode}`);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const loadAll = async (uid: string) => {
    setLoading(true);
    try {
      const { data: sent } = await supabase.from("friendships").select("*").eq("requester_id", uid);
      const { data: received } = await supabase.from("friendships").select("*").eq("addressee_id", uid);
      const allFriendships = [...(sent || []), ...(received || [])];
      const otherIds = allFriendships.map((f: any) => f.requester_id === uid ? f.addressee_id : f.requester_id);
      let profileMap: Record<string, Profile> = {};
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", otherIds);
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      }
      const { data: myProfile } = await supabase.from("profiles").select("username").eq("id", uid).single();
      setMyUsername(myProfile?.username || "You");
      const withProfiles = allFriendships.map((f: any) => ({
        ...f,
        otherUser: profileMap[f.requester_id === uid ? f.addressee_id : f.requester_id] || { id: "", username: "Unknown" },
      }));
      const acceptedFriends = withProfiles.filter((f: any) => f.status === "accepted");
      const pendingIncoming = withProfiles.filter((f: any) => f.status === "pending" && f.addressee_id === uid);
      setFriends(acceptedFriends);
      setPending(pendingIncoming);
      await loadLeaderboard(uid, acceptedFriends, period, profileMap, myProfile?.username);
      await loadChallenges(uid, [...otherIds, uid]);
    } finally { setLoading(false); }
  };

  const loadLeaderboard = async (uid: string, acceptedFriends: Friendship[], p: Period, profileMap?: Record<string, Profile>, myName?: string) => {
    const friendIds = acceptedFriends.map((f: any) => f.requester_id === uid ? f.addressee_id : f.requester_id);
    const allIds = [...friendIds, uid];
    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const since = p === "today" ? today : p === "week" ? weekAgo : format(subDays(new Date(), 29), "yyyy-MM-dd");
    const { data: scores } = await supabase.from("momentum_snapshots").select("user_id,score,date").in("user_id", allIds).gte("date", since);
    const { data: myProfile } = !myName ? await supabase.from("profiles").select("username").eq("id", uid).single() : { data: { username: myName } };
    const scoresByUser: Record<string, number[]> = {};
    (scores || []).forEach((s: any) => { if (!scoresByUser[s.user_id]) scoresByUser[s.user_id] = []; scoresByUser[s.user_id].push(s.score); });
    const [badges, rings] = await Promise.all([
      computeBadges(uid, friendIds),
      computeRings(uid, allIds, today, weekAgo),
    ]);
    const entries: LeaderboardEntry[] = allIds.map(id => {
      const userScores = scoresByUser[id] || [];
      const score = p === "today" ? (userScores[0] || 0) : userScores.length > 0 ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length) : 0;
      let username = "Unknown";
      if (id === uid) username = myProfile?.username || "You";
      else if (profileMap) username = profileMap[id]?.username || "Unknown";
      else username = acceptedFriends.find((f: any) => f.otherUser.id === id)?.otherUser.username || "Unknown";
      return { userId: id, username, score, badges: badges[id] || [], rings: rings[id] || { nutrition: 0, hydration: 0, steps: 0, sleep: 0, workout: 0 } };
    }).sort((a, b) => b.score - a.score);
    setLeaderboard(entries);
  };

  const loadChallenges = async (uid: string, allIds: string[]) => {
    const { data: participations } = await supabase.from("challenge_participants").select("challenge_id").in("user_id", allIds);
    const challengeIds = Array.from(new Set((participations || []).map((p: any) => p.challenge_id)));
    if (challengeIds.length === 0) { setChallenges([]); return; }
    const { data: chs } = await supabase.from("challenges").select("*").in("id", challengeIds);
    const { data: parts } = await supabase.from("challenge_participants").select("challenge_id,user_id").in("challenge_id", challengeIds);
    const creatorIds = Array.from(new Set((chs || []).map((c: any) => c.creator_id)));
    const { data: creatorProfiles } = await supabase.from("profiles").select("id,username").in("id", creatorIds);
    const cpMap: Record<string, string> = {};
    (creatorProfiles || []).forEach((p: any) => { cpMap[p.id] = p.username; });
    const today = format(new Date(), "yyyy-MM-dd");
    const progressMap: Record<string, Record<string, number>> = {};
    for (const ch of (chs || [])) {
      progressMap[ch.id] = {};
      const chParts = (parts || []).filter((p: any) => p.challenge_id === ch.id);
      for (const part of chParts) {
        let val = 0;
        if (ch.type === "steps") {
          const { data } = await supabase.from("step_entries").select("count").eq("user_id", part.user_id).gte("date", ch.start_date).lte("date", today);
          val = (data || []).reduce((a: number, s: any) => a + (s.count || 0), 0);
        } else if (ch.type === "workout") {
          const { data } = await supabase.from("workout_sessions").select("id").eq("user_id", part.user_id).eq("completed", true).gte("date", ch.start_date).lte("date", today);
          val = (data || []).length;
        } else if (ch.type === "nutrition") {
          const { data } = await supabase.from("nutrition_entries").select("calories").eq("user_id", part.user_id).gte("date", ch.start_date).lte("date", today);
          val = (data || []).reduce((a: number, n: any) => a + (n.calories || 0), 0);
        } else if (ch.type === "hydration") {
          const { data } = await supabase.from("hydration_entries").select("amount").eq("user_id", part.user_id).gte("date", ch.start_date).lte("date", today);
          val = (data || []).reduce((a: number, h: any) => a + (h.amount || 0), 0);
        }
        progressMap[ch.id][part.user_id] = val;
      }
    }
    setChallenges((chs || []).map((ch: any) => ({
      ...ch,
      participants: (parts || []).filter((p: any) => p.challenge_id === ch.id).map((p: any) => p.user_id),
      progress: progressMap[ch.id] || {},
      creatorName: cpMap[ch.creator_id] || "Unknown",
    })));
  };

  const createChallenge = async () => {
    if (!challengeForm.title || !challengeForm.goal) return;
    setChallengeLoading(true);
    const id = Math.random().toString(36).slice(2);
    const start = format(new Date(), "yyyy-MM-dd");
    const end = format(subDays(new Date(), -parseInt(challengeForm.days)), "yyyy-MM-dd");
    const allInvitees = Array.from(new Set([...invitedFriends]));
    const { error } = await supabase.from("challenges").insert({ id, creator_id: myId, title: challengeForm.title, type: challengeForm.type, goal: parseFloat(challengeForm.goal), start_date: start, end_date: end, invitee_ids: allInvitees });
    if (!error) {
      // Add creator + all invited friends as participants
      const participants = [myId, ...allInvitees].map(uid => ({ id: Math.random().toString(36).slice(2), challenge_id: id, user_id: uid }));
      await supabase.from("challenge_participants").insert(participants);
      setShowCreateChallenge(false);
      setChallengeForm({ title: "", type: "steps", goal: "", days: "7" });
      setInvitedFriends([]);
      const friendIds = friends.map((f: any) => f.requester_id === myId ? f.addressee_id : f.requester_id);
      await loadChallenges(myId, [...friendIds, myId]);
    }
    setChallengeLoading(false);
  };

  const joinChallenge = async (challengeId: string) => {
    await supabase.from("challenge_participants").insert({ id: Math.random().toString(36).slice(2), challenge_id: challengeId, user_id: myId });
    const friendIds = friends.map((f: any) => f.requester_id === myId ? f.addressee_id : f.requester_id);
    await loadChallenges(myId, [...friendIds, myId]);
  };

  const searchUsers = async () => {
    if (!search.trim()) return;
    const { data } = await supabase.from("profiles").select("id,username").ilike("username", `%${search}%`).neq("id", myId).limit(10);
    setSearchResults(data || []);
  };

  const sendRequest = async (addresseeId: string) => {
    const { error } = await supabase.from("friendships").insert({ id: Math.random().toString(36).slice(2), requester_id: myId, addressee_id: addresseeId, status: "pending" });
    if (!error) { setRequestSent(prev => [...prev, addresseeId]); setSearchResults(prev => prev.filter(p => p.id !== addresseeId)); }
  };

  const acceptRequest = async (friendshipId: string) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId); loadAll(myId); };
  const declineRequest = async (friendshipId: string) => { await supabase.from("friendships").delete().eq("id", friendshipId); loadAll(myId); };

  const medals = ["🥇", "🥈", "🥉"];
  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#9ca3af" }}>
      {label}{count ? ` (${count})` : ""}
    </button>
  );

  const challengeTypes = [
    { value: "steps", label: "Steps", unit: "total steps" },
    { value: "workout", label: "Workouts", unit: "sessions" },
    { value: "nutrition", label: "Calories", unit: "total kcal" },
    { value: "hydration", label: "Hydration", unit: "total ml" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase" }}>Social</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", marginTop: "4px", letterSpacing: "-0.5px" }}>Friends</p>
      </div>

      {pending.length > 0 && (
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", padding: "16px 20px 8px" }}>{pending.length} Friend Request{pending.length > 1 ? "s" : ""}</p>
          {pending.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ color: "#111118", fontWeight: 700, fontSize: "14px" }}>{f.otherUser.username?.[0]?.toUpperCase()}</p>
              </div>
              <p style={{ flex: 1, color: "#111118", fontWeight: 600, fontSize: "14px" }}>{f.otherUser.username}</p>
              <button onClick={() => declineRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "10px", background: "none", border: "none", color: "#6b7280", fontSize: "11px", cursor: "pointer" }}>Decline</button>
              <button onClick={() => acceptRequest(f.id)} style={{ padding: "8px 14px", borderRadius: "12px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>Accept</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {tabBtn("leaderboard", "Board")}
        {tabBtn("friends", "Friends", friends.length || undefined)}
        {tabBtn("challenges", "Challenges")}
        {tabBtn("add", "Add")}
      </div>

      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "4px", background: "white", borderRadius: "14px", padding: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {(["today", "week", "month"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: period === p ? "#111118" : "transparent", color: period === p ? "white" : "#9ca3af" }}>
                {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p></div>
          ) : (
            <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === myId;
                return (
                  <div key={entry.userId} style={{ padding: "16px 20px", background: isMe ? "#111118" : "transparent", borderBottom: i < leaderboard.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <p style={{ fontSize: i < 3 ? "20px" : "13px", width: "28px", textAlign: "center", color: isMe ? "white" : "#9ca3af", fontWeight: 700 }}>
                        {i < 3 ? medals[i] : i + 1}
                      </p>
                      <ActivityRings rings={entry.rings} size={44} />
                      <div style={{ flex: 1 }}>
                        <p style={{ color: isMe ? "white" : "#111118", fontWeight: 700, fontSize: "14px" }}>
                          {entry.username} {isMe && <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 400 }}>(you)</span>}
                        </p>
                        {entry.badges.length > 0 && (
                          <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" as const }}>
                            {entry.badges.map((b, bi) => <span key={bi} title={b.label} style={{ fontSize: "13px" }}>{b.emoji}</span>)}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: "28px", fontWeight: 900, color: isMe ? "white" : "#111118" }}>{entry.score}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ background: "white", borderRadius: "20px", padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Activity Rings</p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" as const }}>
              {[{color:"#f97316",label:"Nutrition"},{color:"#3b82f6",label:"Hydration"},{color:"#22c55e",label:"Steps"},{color:"#a78bfa",label:"Sleep"},{color:"#f43f5e",label:"Workout"}].map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: r.color }} />
                  <p style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "friends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {friends.length === 0 ? (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No friends yet</p>
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Add friends via username or share your invite link</p>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              {friends.map((f, i) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < friends.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px" }}>
                    <p style={{ color: "#111118", fontWeight: 700, fontSize: "14px" }}>{f.otherUser.username?.[0]?.toUpperCase()}</p>
                  </div>
                  <p style={{ color: "#111118", fontWeight: 600, fontSize: "14px" }}>{f.otherUser.username}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "challenges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={() => setShowCreateChallenge(!showCreateChallenge)} style={{ padding: "14px", borderRadius: "14px", background: "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            {showCreateChallenge ? "Cancel" : "+ Create Challenge"}
          </button>

          {showCreateChallenge && (
            <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <input placeholder="Challenge title (e.g. Step Battle 🏆)" value={challengeForm.title} onChange={e => setChallengeForm(f => ({ ...f, title: e.target.value }))}
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "14px", color: "#111118", outline: "none", fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <select value={challengeForm.type} onChange={e => setChallengeForm(f => ({ ...f, type: e.target.value }))}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "13px", color: "#111118", outline: "none", background: "white", fontFamily: "inherit" }}>
                  {challengeTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={challengeForm.days} onChange={e => setChallengeForm(f => ({ ...f, days: e.target.value }))}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "13px", color: "#111118", outline: "none", background: "white", fontFamily: "inherit" }}>
                  {["3","5","7","14","30"].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <input placeholder={`Goal (${challengeTypes.find(t => t.value === challengeForm.type)?.unit})`} value={challengeForm.goal} onChange={e => setChallengeForm(f => ({ ...f, goal: e.target.value }))} type="number"
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "14px", color: "#111118", outline: "none", fontFamily: "inherit" }} />
              {friends.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase" as const, marginBottom: "8px" }}>Invite Friends</p>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                    {friends.map((f: any) => {
                      const fid = f.requester_id === myId ? f.addressee_id : f.requester_id;
                      const selected = invitedFriends.includes(fid);
                      return (
                        <button key={fid} onClick={() => setInvitedFriends(prev => selected ? prev.filter(id => id !== fid) : [...prev, fid])}
                          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", border: `2px solid ${selected ? "#6366f1" : "#f1f5f9"}`, background: selected ? "#eef2ff" : "white", cursor: "pointer", textAlign: "left" as const }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: selected ? "#6366f1" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <p style={{ color: selected ? "white" : "#111118", fontWeight: 700, fontSize: "12px" }}>{f.otherUser.username?.[0]?.toUpperCase()}</p>
                          </div>
                          <p style={{ flex: 1, color: "#111118", fontWeight: 600, fontSize: "13px" }}>{f.otherUser.username}</p>
                          {selected && <span style={{ color: "#6366f1", fontSize: "16px" }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={createChallenge} disabled={challengeLoading} style={{ padding: "14px", borderRadius: "12px", background: "#6366f1", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                {challengeLoading ? "Creating..." : `Create${invitedFriends.length > 0 ? ` & Invite ${invitedFriends.length} Friend${invitedFriends.length > 1 ? "s" : ""}` : ""}`}
              </button>
            </div>
          )}

          {challenges.length === 0 && !showCreateChallenge && (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No active challenges</p>
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Create a challenge and compete with friends</p>
            </div>
          )}

          {challenges.map(ch => {
            const isParticipant = ch.participants.includes(myId);
            const sorted = Object.entries(ch.progress).sort(([,a],[,b]) => b - a);
            const pct = Math.min(((ch.progress[myId] || 0) / ch.goal) * 100, 100);
            return (
              <div key={ch.id} style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#111118" }}>{ch.title}</p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>by {ch.creatorName} · ends {ch.end_date}</p>
                  </div>
                  {!isParticipant && (
                    <button onClick={() => joinChallenge(ch.id)} style={{ padding: "8px 16px", borderRadius: "10px", background: "#6366f1", color: "white", border: "none", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>Join</button>
                  )}
                </div>
                {isParticipant && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <p style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Your progress</p>
                      <p style={{ fontSize: "11px", color: "#111118", fontWeight: 700 }}>{(ch.progress[myId] || 0).toLocaleString()} / {ch.goal.toLocaleString()}</p>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#6366f1", borderRadius: "99px", transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {sorted.map(([uid, val], i) => {
                    const entry = leaderboard.find(e => e.userId === uid);
                    const name = entry?.username || (uid === myId ? myUsername : "Unknown");
                    const userPct = Math.min((val / ch.goal) * 100, 100);
                    return (
                      <div key={uid}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <p style={{ fontSize: "12px", color: uid === myId ? "#111118" : "#6b7280", fontWeight: uid === myId ? 700 : 600 }}>
                            {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}{name}
                          </p>
                          <p style={{ fontSize: "12px", color: "#111118", fontWeight: 700 }}>{val.toLocaleString()}</p>
                        </div>
                        <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${userPct}%`, background: i === 0 ? "#f59e0b" : "#e5e7eb", borderRadius: "99px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "add" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Invite Link</p>
            {inviteCode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", background: "#f7f8fc", padding: "12px", borderRadius: "10px", wordBreak: "break-all" as const }}>
                  {BASE_URL}/invite/{inviteCode}
                </p>
                <button onClick={copyInviteLink} style={{ padding: "12px", borderRadius: "12px", background: inviteCopied ? "#22c55e" : "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  {inviteCopied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>
            ) : (
              <button onClick={generateInviteLink} style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                Generate Invite Link
              </button>
            )}
          </div>

          <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Search by Username</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Search username..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchUsers()}
                style={{ flex: 1, background: "#f7f8fc", border: "none", borderRadius: "12px", padding: "12px 16px", color: "#111118", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={searchUsers} style={{ padding: "12px 20px", borderRadius: "12px", background: "#111118", color: "white", fontWeight: 700, fontSize: "12px", border: "none", cursor: "pointer" }}>Search</button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {searchResults.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "12px", background: "#f7f8fc", borderRadius: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px" }}>
                      <p style={{ color: "#111118", fontWeight: 700, fontSize: "13px" }}>{p.username?.[0]?.toUpperCase()}</p>
                    </div>
                    <p style={{ flex: 1, color: "#111118", fontWeight: 600, fontSize: "14px" }}>{p.username}</p>
                    <button onClick={() => sendRequest(p.id)} disabled={requestSent.includes(p.id)}
                      style={{ padding: "8px 16px", borderRadius: "10px", background: requestSent.includes(p.id) ? "#f1f5f9" : "#111118", border: "none", color: requestSent.includes(p.id) ? "#9ca3af" : "white", fontWeight: 700, fontSize: "11px", cursor: requestSent.includes(p.id) ? "default" : "pointer" }}>
                      {requestSent.includes(p.id) ? "Sent ✓" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
