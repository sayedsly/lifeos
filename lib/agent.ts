"use client";
import { supabase } from "@/lib/supabase/client";
import { addNutritionEntry, getSettings, updateSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";

export interface AgentAction {
  type: "nutrition_log" | "workout_plan" | "finance_split" | "macro_targets" | "none";
  data?: any;
}

export interface AgentResult {
  text: string;
  action: AgentAction | null;
}

export async function runAgent(message: string): Promise<AgentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: session.user.id, accessToken: session.access_token, message }),
  });

  if (res.status === 429) {
    throw new Error("RATE_LIMITED");
  }
  if (!res.ok) throw new Error("Agent request failed");
  return res.json();
}

export async function executeAgentAction(action: AgentAction): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");

  if (action.type === "nutrition_log" && action.data) {
    await addNutritionEntry({
      id: Math.random().toString(36).slice(2),
      date: today,
      timestamp: Date.now(),
      food: action.data.food || "Food",
      amount: action.data.amount || "1 serving",
      meal: action.data.meal || "snack",
      calories: action.data.calories || 0,
      protein: action.data.protein || 0,
      carbs: action.data.carbs || 0,
      fat: action.data.fat || 0,
      fiber: action.data.fiber || 0,
      source: "manual",
    });
    return "Logged to nutrition ✓";
  }

  if (action.type === "macro_targets" && action.data) {
    const settings = await getSettings();
    await updateSettings({
      ...settings,
      macroTargets: {
        ...settings.macroTargets,
        calories: action.data.calories || settings.macroTargets.calories,
        protein: action.data.protein || settings.macroTargets.protein,
        carbs: action.data.carbs || settings.macroTargets.carbs,
        fat: action.data.fat || settings.macroTargets.fat,
      },
    });
    return "Macro targets updated ✓";
  }

  if (action.type === "finance_split" && action.data?.splits) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    const { data: goals } = await supabase.from("finance_goals").select("*").eq("user_id", session.user.id);
    for (const split of action.data.splits) {
      const goal = (goals || []).find((g: any) => g.name.toLowerCase().includes(split.goalName.toLowerCase()));
      await supabase.from("finance_transactions").insert({
        id: Math.random().toString(36).slice(2),
        user_id: session.user.id,
        date: today,
        timestamp: Date.now(),
        amount: split.amount,
        description: `AI split to ${split.goalName}`,
        category: "savings",
        type: "income",
        goal_id: goal?.id || null,
      });
    }
    return "Finance split logged ✓";
  }

  if (action.type === "workout_plan" && action.data) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    await supabase.from("workout_plans").insert({
      id: Math.random().toString(36).slice(2),
      user_id: session.user.id,
      name: action.data.name,
      type: action.data.type || "Push",
      exercises: action.data.exercises || [],
      created_at: Date.now(),
    });
    return "Workout plan saved ✓";
  }

  return "Done ✓";
}

// Speak text aloud using Web Speech Synthesis
export function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1;
  utt.volume = 1;
  // Prefer a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Google UK") || v.name.includes("Moira"));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}