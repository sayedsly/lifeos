import { supabase } from "./client";
import type {
  NutritionEntry, HydrationEntry, SleepEntry,
  Task, MomentumSnapshot, UserSettings, MacroTargets,
  WorkoutSession, FinanceGoal, FinanceTransaction, StepEntry
} from "@/types";

const uid = () => Math.random().toString(36).slice(2);

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// --- Settings ---
export async function getSettings(): Promise<UserSettings> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    return {
      id: "settings",
      name: data.name,
      macroTargets: data.macro_targets,
      hydrationGoal: data.hydration_goal,
      stepGoal: data.step_goal,
      sleepGoal: data.sleep_goal,
      momentumWeights: data.momentum_weights,
      monthlyTokenBudget: 100000,
      tokensUsed: data.tokens_used,
      tokensResetDate: new Date().toISOString().slice(0, 10),
    };
  }

  const defaults: UserSettings = {
    id: "settings",
    name: "You",
    macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 },
    hydrationGoal: 2500,
    stepGoal: 10000,
    sleepGoal: 8,
    momentumWeights: { nutrition: 30, workout: 20, sleep: 15, tasks: 15, finance: 10, steps: 10 },
    monthlyTokenBudget: 100000,
    tokensUsed: 0,
    tokensResetDate: new Date().toISOString().slice(0, 10),
  };

  await supabase.from("user_settings").insert({
    user_id: userId,
    name: defaults.name,
    macro_targets: defaults.macroTargets,
    hydration_goal: defaults.hydrationGoal,
    step_goal: defaults.stepGoal,
    sleep_goal: defaults.sleepGoal,
    momentum_weights: defaults.momentumWeights,
    tokens_used: 0,
  });

  return defaults;
}

export async function updateSettings(patch: Partial<UserSettings>) {
  const userId = await getUserId();
  const update: Record<string, unknown> = {};
  if (patch.name) update.name = patch.name;
  if (patch.macroTargets) update.macro_targets = patch.macroTargets;
  if (patch.hydrationGoal) update.hydration_goal = patch.hydrationGoal;
  if (patch.stepGoal) update.step_goal = patch.stepGoal;
  if (patch.sleepGoal) update.sleep_goal = patch.sleepGoal;
  if (patch.momentumWeights) update.momentum_weights = patch.momentumWeights;
  if (patch.tokensUsed !== undefined) update.tokens_used = patch.tokensUsed;
  await supabase.from("user_settings").update(update).eq("user_id", userId);
}

// --- Nutrition ---
export async function getNutritionForDate(date: string): Promise<NutritionEntry[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("nutrition_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date);
  return (data || []).map(r => ({
    id: r.id, date: r.date, timestamp: r.timestamp,
    food: r.food, amount: r.amount,
    calories: r.calories, protein: r.protein,
    carbs: r.carbs, fat: r.fat, fiber: r.fiber,
    source: r.source,
  }));
}

export async function addNutritionEntry(entry: NutritionEntry) {
  const userId = await getUserId();
  await supabase.from("nutrition_entries").insert({ ...entry, user_id: userId });
}

export async function deleteNutritionEntry(id: string) {
  await supabase.from("nutrition_entries").delete().eq("id", id);
}

export async function getNutritionTotals(date: string): Promise<MacroTargets> {
  const entries = await getNutritionForDate(date);
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + e.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

// --- Hydration ---
export async function getHydrationForDate(date: string): Promise<number> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("hydration_entries")
    .select("amount")
    .eq("user_id", userId)
    .eq("date", date);
  return (data || []).reduce((sum, e) => sum + e.amount, 0);
}

export async function addHydrationEntry(entry: HydrationEntry) {
  const userId = await getUserId();
  await supabase.from("hydration_entries").insert({ ...entry, user_id: userId });
}

// --- Sleep ---
export async function getSleepForDate(date: string): Promise<SleepEntry | undefined> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("sleep_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  if (!data) return undefined;
  return { id: data.id, date: data.date, timestamp: data.timestamp, duration: data.duration, quality: data.quality };
}

export async function upsertSleep(entry: SleepEntry) {
  const userId = await getUserId();
  await supabase.from("sleep_entries").upsert({ ...entry, user_id: userId }, { onConflict: "user_id,date" });
}

// --- Steps ---
export async function getStepsForDate(date: string): Promise<number> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("step_entries")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  return data?.count || 0;
}

export async function upsertSteps(entry: StepEntry) {
  const userId = await getUserId();
  await supabase.from("step_entries").upsert({ ...entry, user_id: userId }, { onConflict: "user_id,date" });
}

// --- Tasks ---
export async function getTasksForDate(date: string): Promise<Task[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date);
  return (data || []).map(r => ({
    id: r.id, date: r.date, title: r.title,
    completed: r.completed, priority: r.priority, createdAt: r.created_at,
  }));
}

export async function upsertTask(task: Task) {
  const userId = await getUserId();
  await supabase.from("tasks").upsert({
    id: task.id, user_id: userId, date: task.date,
    title: task.title, completed: task.completed,
    priority: task.priority, created_at: task.createdAt,
  });
}

export async function toggleTask(id: string) {
  const userId = await getUserId();
  const { data } = await supabase.from("tasks").select("completed").eq("id", id).single();
  if (data) await supabase.from("tasks").update({ completed: !data.completed }).eq("id", id);
}

// --- Momentum ---
export async function getMomentumForDate(date: string): Promise<MomentumSnapshot | undefined> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("momentum_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  if (!data) return undefined;
  return { id: data.id, date: data.date, score: data.score, breakdown: data.breakdown, computedAt: data.computed_at };
}

export async function saveMomentum(snapshot: MomentumSnapshot) {
  const userId = await getUserId();
  await supabase.from("momentum_snapshots").upsert({
    id: snapshot.id, user_id: userId, date: snapshot.date,
    score: snapshot.score, breakdown: snapshot.breakdown,
    computed_at: snapshot.computedAt,
  }, { onConflict: "user_id,date" });
}

export async function getLast7DaysMomentum(): Promise<MomentumSnapshot[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("momentum_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(7);
  return (data || []).map(r => ({
    id: r.id, date: r.date, score: r.score,
    breakdown: r.breakdown, computedAt: r.computed_at,
  }));
}

export async function logTokenUsage(tokens: number) {
  const s = await getSettings();
  await updateSettings({ tokensUsed: s.tokensUsed + tokens });
}

// --- Leaderboard ---
export async function getLeaderboard(): Promise<Array<{ username: string; score: number; date: string }>> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("momentum_snapshots")
    .select("score, date, user_id, profiles(username)")
    .eq("date", today)
    .order("score", { ascending: false });
  return (data || []).map((r: any) => ({
    username: r.profiles?.username || "Unknown",
    score: r.score,
    date: r.date,
  }));
}
