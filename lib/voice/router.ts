import type { ParsedIntent, NutritionEntry, HydrationEntry, SleepEntry, Task, FinanceTransaction, StepEntry } from "@/types";
import {
  addNutritionEntry,
  addHydrationEntry,
  upsertSleep,
  upsertTask,
  upsertSteps,
  getStepsForDate,
} from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");
const uid = () => Math.random().toString(36).slice(2);

export async function executeIntent(intent: ParsedIntent): Promise<void> {
  const d = intent.data;
  const date = today();

  switch (intent.domain) {
    case "nutrition_add": {
      const entry: NutritionEntry = {
        id: uid(), date, timestamp: Date.now(),
        food: d.food as string,
        amount: d.amount as string,
        calories: d.calories as number,
        protein: d.protein as number,
        carbs: d.carbs as number,
        fat: d.fat as number,
        fiber: d.fiber as number,
        source: "voice",
      };
      await addNutritionEntry(entry);
      break;
    }
    case "hydration_add": {
      const entry: HydrationEntry = { id: uid(), date, timestamp: Date.now(), amount: d.amount as number };
      await addHydrationEntry(entry);
      break;
    }
    case "sleep_log": {
      const entry: SleepEntry = { id: uid(), date, timestamp: Date.now(), duration: d.duration as number, quality: d.quality as number };
      await upsertSleep(entry);
      break;
    }
    case "task_create": {
      const task: Task = { id: uid(), date, title: d.title as string, completed: false, priority: d.priority as 1 | 2 | 3, createdAt: Date.now() };
      await upsertTask(task);
      break;
    }
    case "steps_update": {
      const current = await getStepsForDate(date);
      const entry: StepEntry = { id: uid(), date, count: d.count as number };
      await upsertSteps(entry);
      break;
    }
    case "finance_goal_add": {
      const { data: goals } = await supabase.from("finance_goals").select("*");
      const name = (d.goalName as string).toLowerCase();
      const goal = (goals || []).find((g: any) => g.name.toLowerCase().includes(name));
      if (goal) await supabase.from("finance_goals").update({ current: goal.current + (d.amount as number) }).eq("id", goal.id);
      break;
    }
    case "finance_expense": {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) break;
      const tx: FinanceTransaction = {
        id: uid(), date, timestamp: Date.now(),
        amount: d.amount as number,
        category: d.category as string,
        description: d.description as string,
        type: "expense",
      };
      await supabase.from("finance_transactions").insert({ ...tx, user_id: user.id });
      break;
    }
    default:
      break;
  }

  await computeMomentum(date);
}
