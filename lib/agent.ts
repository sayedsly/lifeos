"use client";
import { supabase } from "@/lib/supabase/client";
import { addNutritionEntry, getSettings, updateSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";

export interface AgentAction {
  type: "nutrition_log" | "workout_plan" | "finance_split" | "macro_targets" | "task_add" | "task_complete" | "hydration_log" | "sleep_log" | "none";
  data?: any;
}

export interface AgentResult {
  text: string;
  action: AgentAction | null;
}

export async function runAgent(message: string, history: {role:"user"|"ai";text:string}[] = []): Promise<AgentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: session.user.id, accessToken: session.access_token, message, history }),
  });

  if (res.status === 429) throw new Error("RATE_LIMITED");
  const data = await res.json();
  console.log("Agent response:", JSON.stringify(data).slice(0, 200));
  if (!res.ok || data.error) throw new Error(data.error || "Agent request failed");
  if (!data.text) throw new Error("No text in response: " + JSON.stringify(data).slice(0, 100));
  return data;
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
      const goal = (goals || []).find((g: any) => g.name.toLowerCase().includes(split.goalName.toLowerCase()) || split.goalName.toLowerCase().includes(g.name.toLowerCase()));
      await supabase.from("finance_transactions").insert({
        id: Math.random().toString(36).slice(2),
        user_id: session.user.id,
        date: today,
        timestamp: Date.now(),
        amount: split.amount,
        description: `AI split to ${split.goalName}`,
        category: "savings",
        type: "income",
        goal_id: goal?.id ?? null,
      });
    }
    return "Finance split logged ✓";
  }

  if (action.type === "task_add" && action.data) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    const tasks = Array.isArray(action.data.tasks) ? action.data.tasks : [action.data];
    for (const t of tasks) {
      await supabase.from("tasks").insert({
        id: Math.random().toString(36).slice(2),
        user_id: session.user.id,
        date: today,
        title: t.title || t,
        completed: false,
        priority: t.priority || 2,
        created_at: Date.now(),
      });
    }
    return tasks.length > 1 ? `Added ${tasks.length} tasks ✓` : `Task added ✓`;
  }

  if (action.type === "hydration_log" && action.data) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    await supabase.from("hydration_entries").insert({
      id: Math.random().toString(36).slice(2),
      user_id: session.user.id,
      date: today,
      amount: action.data.amount || 250,
      timestamp: Date.now(),
    });
    return `Logged ${action.data.amount}ml water ✓`;
  }

  if (action.type === "sleep_log" && action.data) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    await supabase.from("sleep_entries").upsert({
      id: Math.random().toString(36).slice(2),
      user_id: session.user.id,
      date: today,
      duration: action.data.duration || 8,
      quality: action.data.quality || 3,
      bedtime: action.data.bedtime || "23:00",
      wake_time: action.data.wakeTime || "07:00",
      timestamp: Date.now(),
    });
    return `Sleep logged ✓`;
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
export function speak(text: string, voiceName?: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 1;
  utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  if (voiceName) {
    const v = voices.find(v => v.name === voiceName);
    if (v) utt.voice = v;
  } else {
    // Priority order of natural voices
    const preferred = voices.find(v =>
      v.name === "Samantha" ||
      v.name.includes("Google US English") ||
      v.name.includes("Google UK English Female") ||
      v.name === "Karen" ||
      v.name === "Moira"
    );
    if (preferred) utt.voice = preferred;
  }
  window.speechSynthesis.speak(utt);
}

export function getAvailableVoices(): { name: string; lang: string; label: string }[] {
  if (typeof window === "undefined") return [];
  const NICE_VOICES = [
    { match: "Samantha", label: "🇺🇸 Samantha (US Female)" },
    { match: "Google US English", label: "🇺🇸 Google US English" },
    { match: "Google UK English Female", label: "🇬🇧 Google UK Female" },
    { match: "Google UK English Male", label: "🇬🇧 Google UK Male" },
    { match: "Karen", label: "🇦🇺 Karen (Australian)" },
    { match: "Moira", label: "🇮🇪 Moira (Irish)" },
    { match: "Daniel", label: "🇬🇧 Daniel (British Male)" },
    { match: "Tessa", label: "🇿🇦 Tessa (South African)" },
    { match: "Rishi", label: "🇮🇳 Rishi (Indian)" },
  ];
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
  const result: { name: string; lang: string; label: string }[] = [];
  for (const nv of NICE_VOICES) {
    const found = voices.find(v => v.name.includes(nv.match));
    if (found) result.push({ name: found.name, lang: found.lang, label: nv.label });
  }
  // Add remaining en voices not already included
  for (const v of voices) {
    if (!result.find(r => r.name === v.name) && result.length < 10) {
      result.push({ name: v.name, lang: v.lang, label: v.name });
    }
  }
  return result;
}