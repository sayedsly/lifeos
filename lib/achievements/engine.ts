import { createClient } from "@supabase/supabase-js";

const ACHIEVEMENT_DEFS = [
  { type: "first_workout", emoji: "💪", title: "First Rep", description: "Logged your first workout" },
  { type: "first_nutrition", emoji: "🥗", title: "Tracked", description: "Logged your first meal" },
  { type: "first_weight", emoji: "⚖️", title: "Weighed In", description: "Logged your first body weight" },
  { type: "streak_3", emoji: "🔥", title: "3-Day Streak", description: "Logged momentum 3 days in a row" },
  { type: "streak_7", emoji: "⚡", title: "Week Warrior", description: "7-day momentum streak" },
  { type: "streak_30", emoji: "🏆", title: "Unstoppable", description: "30-day momentum streak" },
  { type: "protein_goal_5", emoji: "🥩", title: "Protein King", description: "Hit protein goal 5 days in a row" },
  { type: "hydration_goal_7", emoji: "💧", title: "Hydration Hero", description: "Hit water goal 7 days in a row" },
  { type: "steps_goal_7", emoji: "👟", title: "Step Master", description: "Hit step goal 7 days in a row" },
  { type: "workouts_10", emoji: "🏋️", title: "Iron Regular", description: "Completed 10 workouts total" },
  { type: "workouts_50", emoji: "💎", title: "Diamond", description: "Completed 50 workouts total" },
  { type: "perfect_day", emoji: "⭐", title: "Perfect Day", description: "Scored 100 momentum in a day" },
  { type: "sleep_goal_7", emoji: "😴", title: "Sleep King", description: "Hit sleep goal 7 nights in a row" },
  { type: "finance_goal_complete", emoji: "💰", title: "Money Moves", description: "Completed a finance goal" },
];

export async function checkAndAwardAchievements(userId: string, accessToken: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: existing } = await supabase.from("achievements").select("type").eq("user_id", userId);
  const earned = new Set((existing || []).map((a: any) => a.type));
  const newAchievements: any[] = [];

  const award = (type: string) => {
    if (earned.has(type)) return;
    const def = ACHIEVEMENT_DEFS.find(d => d.type === type);
    if (!def) return;
    newAchievements.push({ id: Math.random().toString(36).slice(2), user_id: userId, ...def });
    earned.add(type);
  };

  const today = new Date().toISOString().slice(0, 10);
  const ago30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const [
    { data: workouts }, { data: nutrition }, { data: weights },
    { data: momentum }, { data: sleep }, { data: steps },
    { data: hydration }, { data: settings }, { data: financeGoals }, { data: transactions }
  ] = await Promise.all([
    supabase.from("workout_sessions").select("date,completed").eq("user_id", userId),
    supabase.from("nutrition_entries").select("date,protein").eq("user_id", userId).gte("date", ago30),
    supabase.from("body_weight_entries").select("id").eq("user_id", userId).limit(1),
    supabase.from("momentum_snapshots").select("date,score").eq("user_id", userId).order("date", { ascending: false }).limit(60),
    supabase.from("sleep_entries").select("date,duration").eq("user_id", userId).gte("date", ago30),
    supabase.from("step_entries").select("date,count").eq("user_id", userId).gte("date", ago30),
    supabase.from("hydration_entries").select("date,amount").eq("user_id", userId).gte("date", ago30),
    supabase.from("user_settings").select("*").eq("user_id", userId).single(),
    supabase.from("finance_goals").select("id").eq("user_id", userId),
    supabase.from("finance_transactions").select("goal_id,amount,type").eq("user_id", userId),
  ]);

  const s = settings || {};
  const completedWorkouts = (workouts || []).filter((w: any) => w.completed);

  if (completedWorkouts.length >= 1) award("first_workout");
  if ((nutrition || []).length >= 1) award("first_nutrition");
  if ((weights || []).length >= 1) award("first_weight");
  if (completedWorkouts.length >= 10) award("workouts_10");
  if (completedWorkouts.length >= 50) award("workouts_50");

  // Momentum streak
  let mStreak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const snap = (momentum || []).find((m: any) => m.date === d);
    if (snap && snap.score > 0) mStreak++;
    else if (d === today) continue;
    else break;
  }
  if (mStreak >= 3) award("streak_3");
  if (mStreak >= 7) award("streak_7");
  if (mStreak >= 30) award("streak_30");

  // Perfect day
  if ((momentum || []).some((m: any) => m.score >= 100)) award("perfect_day");

  // Protein streak 5 days
  const proteinGoal = s.macro_targets?.protein || 150;
  let proteinStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const dayProtein = (nutrition || []).filter((n: any) => n.date === d).reduce((a: number, n: any) => a + (n.protein || 0), 0);
    if (dayProtein >= proteinGoal) proteinStreak++; else break;
  }
  if (proteinStreak >= 5) award("protein_goal_5");

  // Hydration streak 7 days
  const hydGoal = s.hydration_goal || 2500;
  const hydByDay: Record<string, number> = {};
  (hydration || []).forEach((h: any) => { hydByDay[h.date] = (hydByDay[h.date] || 0) + h.amount; });
  let hydStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    if ((hydByDay[d] || 0) >= hydGoal) hydStreak++; else break;
  }
  if (hydStreak >= 7) award("hydration_goal_7");

  // Steps streak 7 days
  const stepGoal = s.step_goal || 10000;
  let stepStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const count = (steps || []).find((s: any) => s.date === d)?.count || 0;
    if (count >= stepGoal) stepStreak++; else break;
  }
  if (stepStreak >= 7) award("steps_goal_7");

  // Sleep streak 7 days
  const sleepGoal = s.sleep_goal || 8;
  let sleepStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const dur = (sleep || []).find((s: any) => s.date === d)?.duration || 0;
    if (dur >= sleepGoal) sleepStreak++; else break;
  }
  if (sleepStreak >= 7) award("sleep_goal_7");

  // Finance goal completed
  for (const goal of (financeGoals || [])) {
    const progress = (transactions || []).filter((t: any) => t.goal_id === goal.id && t.type === "income").reduce((a: number, t: any) => a + (t.amount || 0), 0);
    const goalData = await supabase.from("finance_goals").select("target").eq("id", goal.id).single();
    if (progress >= (goalData.data?.target || Infinity)) { award("finance_goal_complete"); break; }
  }

  if (newAchievements.length > 0) {
    await supabase.from("achievements").insert(newAchievements);
  }

  return newAchievements;
}
