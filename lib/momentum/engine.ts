import type { MomentumBreakdown, MomentumSnapshot } from "@/types";
import {
  getNutritionTotals,
  getHydrationForDate,
  getSleepForDate,
  getTasksForDate,
  getSettings,
  saveMomentum,
  getStepsForDate,
} from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export async function computeMomentum(date: string = todayStr()): Promise<MomentumSnapshot> {
  const settings = await getSettings();
  const { macroTargets, hydrationGoal, sleepGoal, stepGoal, momentumWeights } = settings;

  // Nutrition
  const totals = await getNutritionTotals(date);
  const calScore = Math.min(totals.calories / macroTargets.calories, 1);
  const protScore = Math.min(totals.protein / macroTargets.protein, 1);
  const nutritionScore = Math.round(((calScore + protScore) / 2) * momentumWeights.nutrition);

  // Sleep
  const sleep = await getSleepForDate(date);
  const sleepScore = sleep
    ? Math.round(Math.min(sleep.duration / sleepGoal, 1) * momentumWeights.sleep)
    : 0;

  // Workout
  const { data: workout } = await supabase
    .from("workout_sessions")
    .select("completed")
    .eq("date", date)
    .single();
  const workoutScore = workout?.completed ? momentumWeights.workout : 0;

  // Tasks
  const tasks = await getTasksForDate(date);
  const taskScore = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * momentumWeights.tasks)
    : 0;

  // Finance — score based on whether any expense was logged today
  const { data: { user } } = await supabase.auth.getUser();
  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("user_id", user?.id)
    .eq("date", date)
    .limit(1);
  const { data: goals } = await supabase
    .from("finance_goals")
    .select("id, current, target")
    .eq("user_id", user?.id);
  const hasLoggedExpense = (transactions?.length || 0) > 0;
  const hasGoalProgress = (goals || []).some(g => g.current > 0);
  const financeScore = (hasLoggedExpense || hasGoalProgress)
    ? momentumWeights.finance
    : Math.round(momentumWeights.finance * 0.3); // 30% if nothing logged

  // Steps
  const steps = await getStepsForDate(date);
  const stepsScore = Math.round(Math.min(steps / stepGoal, 1) * momentumWeights.steps);

  const breakdown: MomentumBreakdown = {
    nutrition: nutritionScore,
    workout: workoutScore,
    sleep: sleepScore,
    tasks: taskScore,
    finance: financeScore,
    steps: stepsScore,
  };

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  const snapshot: MomentumSnapshot = {
    id: `momentum-${date}`,
    date,
    score,
    breakdown,
    computedAt: Date.now(),
  };

  await saveMomentum(snapshot);
  return snapshot;
}

export function getWeakestLink(breakdown: MomentumBreakdown): string {
  const maxPossible: MomentumBreakdown = {
    nutrition: 30, workout: 20, sleep: 15,
    tasks: 15, finance: 10, steps: 10,
  };
  let worst = "";
  let worstPct = 1;
  for (const key of Object.keys(breakdown) as (keyof MomentumBreakdown)[]) {
    const pct = breakdown[key] / maxPossible[key];
    if (pct < worstPct) { worstPct = pct; worst = key; }
  }
  return worst;
}
