import { db } from "./schema";
import type {
  NutritionEntry,
  HydrationEntry,
  SleepEntry,
  Task,
  MomentumSnapshot,
  UserSettings,
  MacroTargets,
} from "@/types";
import { format } from "date-fns";

export const today = () => format(new Date(), "yyyy-MM-dd");

export async function getSettings(): Promise<UserSettings> {
  const s = await db.settings.get("settings");
  if (s) return s;
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
    tokensResetDate: today(),
  };
  await db.settings.put(defaults);
  return defaults;
}

export async function updateSettings(patch: Partial<UserSettings>) {
  const s = await getSettings();
  await db.settings.put({ ...s, ...patch });
}

export async function getNutritionForDate(date: string): Promise<NutritionEntry[]> {
  return db.nutrition.where("date").equals(date).toArray();
}

export async function addNutritionEntry(entry: NutritionEntry) {
  await db.nutrition.put(entry);
}

export async function deleteNutritionEntry(id: string) {
  await db.nutrition.delete(id);
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

export async function getHydrationForDate(date: string): Promise<number> {
  const entries = await db.hydration.where("date").equals(date).toArray();
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

export async function addHydrationEntry(entry: HydrationEntry) {
  await db.hydration.put(entry);
}

export async function getSleepForDate(date: string): Promise<SleepEntry | undefined> {
  return db.sleep.where("date").equals(date).first();
}

export async function upsertSleep(entry: SleepEntry) {
  await db.sleep.put(entry);
}

export async function getTasksForDate(date: string): Promise<Task[]> {
  return db.tasks.where("date").equals(date).toArray();
}

export async function upsertTask(task: Task) {
  await db.tasks.put(task);
}

export async function toggleTask(id: string) {
  const task = await db.tasks.get(id);
  if (task) await db.tasks.put({ ...task, completed: !task.completed });
}

export async function getMomentumForDate(date: string): Promise<MomentumSnapshot | undefined> {
  return db.momentum.where("date").equals(date).first();
}

export async function saveMomentum(snapshot: MomentumSnapshot) {
  await db.momentum.put(snapshot);
}

export async function getLast7DaysMomentum(): Promise<MomentumSnapshot[]> {
  const entries = await db.momentum.toArray();
  return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
}

export async function logTokenUsage(tokens: number) {
  const s = await getSettings();
  await updateSettings({ tokensUsed: s.tokensUsed + tokens });
}
