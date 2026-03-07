"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

interface Achievement { id: string; type: string; emoji: string; title: string; description: string; earned_at: string; }
interface MoodEntry { id: string; date: string; mood: number; note: string; }
interface ProgressPhoto { id: string; date: string; url: string; note: string; weight?: number; }

const MOOD_LABELS = ["", "😞 Rough", "😕 Meh", "😐 OK", "🙂 Good", "😄 Great"];
const MOOD_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#6366f1"];

const ALL_ACHIEVEMENTS = [
  { type: "first_workout", emoji: "💪", title: "First Rep", description: "Log your first workout" },
  { type: "first_nutrition", emoji: "🥗", title: "Tracked", description: "Log your first meal" },
  { type: "first_weight", emoji: "⚖️", title: "Weighed In", description: "Log your first body weight" },
  { type: "streak_3", emoji: "🔥", title: "3-Day Streak", description: "3-day momentum streak" },
  { type: "streak_7", emoji: "⚡", title: "Week Warrior", description: "7-day momentum streak" },
  { type: "streak_30", emoji: "🏆", title: "Unstoppable", description: "30-day momentum streak" },
  { type: "protein_goal_5", emoji: "🥩", title: "Protein King", description: "Hit protein goal 5 days" },
  { type: "hydration_goal_7", emoji: "💧", title: "Hydration Hero", description: "Hit water goal 7 days" },
  { type: "steps_goal_7", emoji: "👟", title: "Step Master", description: "Hit step goal 7 days" },
  { type: "workouts_10", emoji: "🏋️", title: "Iron Regular", description: "Complete 10 workouts" },
  { type: "workouts_50", emoji: "💎", title: "Diamond", description: "Complete 50 workouts" },
  { type: "perfect_day", emoji: "⭐", title: "Perfect Day", description: "Score 100 momentum" },
  { type: "sleep_goal_7", emoji: "😴", title: "Sleep King", description: "Hit sleep goal 7 nights" },
  { type: "finance_goal_complete", emoji: "💰", title: "Money Moves", description: "Complete a finance goal" },
];

export default function AchievementsPage() {
  const [tab, setTab] = useState<"achievements" | "mood" | "photos">("achievements");
  const [userId, setUserId] = useState("");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [todayMood, setTodayMood] = useState<number>(0);
  const [moodNote, setMoodNote] = useState("");
  const [moodSaved, setMoodSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [photoWeight, setPhotoWeight] = useState("");
  const [photoCategory, setPhotoCategory] = useState("body");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      loadAll(data.user.id);
    });
  }, []);

  const loadAll = async (uid: string) => {
    const [{ data: ach }, { data: md }, { data: ph }] = await Promise.all([
      supabase.from("achievements").select("*").eq("user_id", uid).order("earned_at", { ascending: false }),
      supabase.from("mood_entries").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(30),
      supabase.from("progress_photos").select("*").eq("user_id", uid).order("date", { ascending: false }),
    ]);
    setAchievements(ach || []);
    setMoods(md || []);
    setPhotos(ph || []);
    const today = format(new Date(), "yyyy-MM-dd");
    const todayEntry = (md || []).find((m: any) => m.date === today);
    if (todayEntry) { setTodayMood(todayEntry.mood); setMoodNote(todayEntry.note || ""); setMoodSaved(true); }
  };

  const checkAchievements = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/achievements/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, accessToken: session.access_token }) });
    const { newAchievements } = await res.json();
    await loadAll(userId);
    setChecking(false);
    return newAchievements;
  };

  const saveMood = async () => {
    if (!todayMood) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const existing = moods.find(m => m.date === today);
    if (existing) {
      await supabase.from("mood_entries").update({ mood: todayMood, note: moodNote }).eq("id", existing.id);
    } else {
      await supabase.from("mood_entries").insert({ id: Math.random().toString(36).slice(2), user_id: userId, date: today, mood: todayMood, note: moodNote });
    }
    setMoodSaved(true);
    loadAll(userId);
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    setPhotoUploadError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, file, { upsert: true });
      if (uploadError) { setPhotoUploadError("Upload failed: " + uploadError.message); setPhotoUploading(false); return; }
      const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path);
      const today = format(new Date(), "yyyy-MM-dd");
      const { error: dbError } = await supabase.from("progress_photos").insert({ id: Math.random().toString(36).slice(2), user_id: userId, date: today, url: urlData.publicUrl, note: photoNote, weight: photoWeight ? parseFloat(photoWeight) : null, category: photoCategory });
      if (dbError) { setPhotoUploadError("Save failed: " + dbError.message); setPhotoUploading(false); return; }
      setPhotoNote(""); setPhotoWeight(""); setPhotoCategory("body");
      setPhotoUploading(false);
      loadAll(userId);
    } catch (e: any) {
      setPhotoUploadError("Error: " + e.message);
      setPhotoUploading(false);
    }
  };

  const earnedTypes = new Set(achievements.map(a => a.type));
  const today = format(new Date(), "yyyy-MM-dd");

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#9ca3af" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase" }}>Progress</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", marginTop: "4px", letterSpacing: "-0.5px" }}>Achievements</p>
      </div>

      <div style={{ display: "flex", gap: "4px", background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {tabBtn("achievements", "Badges")}
        {tabBtn("mood", "Mood")}
        {tabBtn("photos", "Photos")}
      </div>

      {tab === "achievements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>{achievements.length} / {ALL_ACHIEVEMENTS.length} earned</p>
            <button onClick={checkAchievements} disabled={checking} style={{ padding: "8px 16px", borderRadius: "12px", background: "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
              {checking ? "Checking..." : "Check Progress"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {ALL_ACHIEVEMENTS.map(def => {
              const isEarned = earnedTypes.has(def.type);
              const earnedData = achievements.find(a => a.type === def.type);
              return (
                <div key={def.type} style={{ background: "white", borderRadius: "16px", padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: isEarned ? 1 : 0.45, position: "relative" as const }}>
                  {isEarned && <div style={{ position: "absolute" as const, top: "10px", right: "10px", width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />}
                  <p style={{ fontSize: "28px", marginBottom: "8px" }}>{isEarned ? def.emoji : "🔒"}</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{def.title}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{def.description}</p>
                  {isEarned && earnedData && (
                    <p style={{ fontSize: "10px", color: "#22c55e", marginTop: "6px", fontWeight: 600 }}>
                      {format(new Date(earnedData.earned_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "mood" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>How are you feeling today?</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              {[1,2,3,4,5].map(m => (
                <button key={m} onClick={() => { setTodayMood(m); setMoodSaved(false); }}
                  style={{ width: "52px", height: "52px", borderRadius: "16px", border: `2px solid ${todayMood === m ? MOOD_COLORS[m] : "#f1f5f9"}`, background: todayMood === m ? MOOD_COLORS[m] + "20" : "white", fontSize: "24px", cursor: "pointer" }}>
                  {MOOD_LABELS[m].split(" ")[0]}
                </button>
              ))}
            </div>
            {todayMood > 0 && (
              <>
                <p style={{ fontSize: "13px", fontWeight: 600, color: MOOD_COLORS[todayMood], marginBottom: "12px", textAlign: "center" }}>{MOOD_LABELS[todayMood]}</p>
                <input placeholder="Add a note (optional)..." value={moodNote} onChange={e => { setMoodNote(e.target.value); setMoodSaved(false); }}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "13px", color: "#111118", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                <button onClick={saveMood} style={{ width: "100%", marginTop: "10px", padding: "12px", borderRadius: "12px", background: moodSaved ? "#22c55e" : "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  {moodSaved ? "Saved ✓" : "Save Mood"}
                </button>
              </>
            )}
          </div>

          {moods.length > 0 && (
            <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "16px" }}>Last 30 Days</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, marginBottom: "16px" }}>
                {Array.from({ length: 30 }, (_, i) => {
                  const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
                  const entry = moods.find(m => m.date === d);
                  return (
                    <div key={d} title={entry ? `${d}: ${MOOD_LABELS[entry.mood]}` : d}
                      style={{ width: "24px", height: "24px", borderRadius: "6px", background: entry ? MOOD_COLORS[entry.mood] : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                      {entry ? MOOD_LABELS[entry.mood].split(" ")[0] : ""}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {moods.slice(0, 7).map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: MOOD_COLORS[m.mood] + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                      {MOOD_LABELS[m.mood].split(" ")[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#111118" }}>{format(new Date(m.date), "EEEE, MMM d")}</p>
                      {m.note && <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{m.note}</p>}
                    </div>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: MOOD_COLORS[m.mood] }}>{MOOD_LABELS[m.mood].split(" ").slice(1).join(" ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "photos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Add Progress Photo</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {[{v:"body",l:"💪 Body"},{v:"food",l:"🥗 Food"},{v:"workout",l:"🏋️ Workout"},{v:"other",l:"📸 Other"}].map(c => (
                  <button key={c.v} onClick={() => setPhotoCategory(c.v)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: "10px", border: `2px solid ${photoCategory === c.v ? "#6366f1" : "#f1f5f9"}`, background: photoCategory === c.v ? "#eef2ff" : "white", fontSize: "10px", fontWeight: 700, color: photoCategory === c.v ? "#6366f1" : "#9ca3af", cursor: "pointer" }}>
                    {c.l}
                  </button>
                ))}
              </div>
              <input placeholder="Note (optional)" value={photoNote} onChange={e => setPhotoNote(e.target.value)}
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "13px", color: "#111118", outline: "none", fontFamily: "inherit" }} />
              <input placeholder="Weight (optional, e.g. 175 lbs)" value={photoWeight} onChange={e => setPhotoWeight(e.target.value)} type="number"
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "13px", color: "#111118", outline: "none", fontFamily: "inherit" }} />
              {photoUploadError && <p style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>{photoUploadError}</p>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); }} />
              <button onClick={() => fileRef.current?.click()} disabled={photoUploading}
                style={{ padding: "14px", borderRadius: "12px", background: photoUploading ? "#9ca3af" : "#111118", color: "white", border: "none", fontWeight: 700, fontSize: "13px", cursor: photoUploading ? "default" : "pointer" }}>
                {photoUploading ? "Uploading... ⏳" : "📷 Choose Photo"}
              </button>
            </div>
          </div>

          {photos.length > 0 && (
            <div style={{ background: "white", borderRadius: "16px", padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
              <div style={{ display: "flex", gap: "4px", flex: 1, flexWrap: "wrap" as const }}>
                {[{v:"all",l:"All"},{v:"body",l:"💪"},{v:"food",l:"🥗"},{v:"workout",l:"🏋️"},{v:"other",l:"📸"}].map(c => (
                  <button key={c.v} onClick={() => setFilterCategory(c.v)}
                    style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: filterCategory === c.v ? "#111118" : "#f1f5f9", color: filterCategory === c.v ? "white" : "#6b7280", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                    {c.l}
                  </button>
                ))}
              </div>
              <button onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#f1f5f9", color: "#6b7280", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                {sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}
              </button>
            </div>
          )}

          {photos.length >= 2 && (
            <button onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
              style={{ padding: "12px", borderRadius: "12px", background: compareMode ? "#6366f1" : "white", color: compareMode ? "white" : "#111118", border: "none", fontWeight: 700, fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              {compareMode ? "Exit Compare" : "⚖️ Compare Photos"}
            </button>
          )}

          {compareMode && compareA && compareB && (
            <div style={{ background: "white", borderRadius: "20px", padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>Side by Side</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[compareA, compareB].map(id => {
                  const p = photos.find(ph => ph.id === id)!;
                  return (
                    <div key={id}>
                      <img src={p.url} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: "12px" }} />
                      <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px", textAlign: "center" }}>{format(new Date(p.date), "MMM d, yyyy")}</p>
                      {p.weight && <p style={{ fontSize: "11px", fontWeight: 700, color: "#111118", textAlign: "center" }}>{p.weight} lbs</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[...photos]
              .filter(p => filterCategory === "all" || (p as any).category === filterCategory)
              .sort((a, b) => sortOrder === "newest" ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(p => {
              const isSelectedA = compareA === p.id;
              const isSelectedB = compareB === p.id;
              const isSelected = isSelectedA || isSelectedB;
              return (
                <div key={p.id} onClick={() => {
                  if (!compareMode) return;
                  if (isSelectedA) { setCompareA(null); return; }
                  if (isSelectedB) { setCompareB(null); return; }
                  if (!compareA) setCompareA(p.id);
                  else if (!compareB) setCompareB(p.id);
                }}
                  style={{ borderRadius: "16px", overflow: "hidden", boxShadow: isSelected ? `0 0 0 3px #6366f1` : "0 2px 12px rgba(0,0,0,0.06)", cursor: compareMode ? "pointer" : "default", position: "relative" as const }}>
                  <img src={p.url} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                  {isSelected && <div style={{ position: "absolute" as const, top: "8px", right: "8px", width: "24px", height: "24px", borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: 700 }}>{isSelectedA ? "A" : "B"}</div>}
                  <div style={{ padding: "10px 12px", background: "white" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#111118" }}>{format(new Date(p.date), "MMM d, yyyy")}</p>
                    {p.weight && <p style={{ fontSize: "11px", color: "#9ca3af" }}>{p.weight} lbs</p>}
                    {p.note && <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>{p.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {photos.length === 0 && (
            <div style={{ background: "white", borderRadius: "20px", padding: "40px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "32px" }}>📷</p>
              <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "12px" }}>No photos yet</p>
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Track your physical transformation over time</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
