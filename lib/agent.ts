"use client";
import { supabase } from "@/lib/supabase/client";
import { addNutritionEntry, getSettings, updateSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";

export interface AgentAction {
  type: string;
  data?: any;
}

export interface AgentResult {
  text: string;
  actions: AgentAction[];
  needsFollowUp: boolean;
}

let _sessionHistory: {role:"user"|"ai";text:string}[] = [];
export function setAgentHistory(h: {role:"user"|"ai";text:string}[]) { _sessionHistory = h; }
export function appendAgentHistory(role: "user"|"ai", text: string) { _sessionHistory = [..._sessionHistory.slice(-9), {role, text}]; }
export function getAgentHistory() { return _sessionHistory; }

export async function runAgent(message: string, history: {role:"user"|"ai";text:string}[] = []): Promise<AgentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: session.user.id,
      accessToken: session.access_token,
      message,
      history: history.length > 0 ? history : _sessionHistory,
    }),
  });

  const data = await res.json();
  if (data.error) {
    if (data.error.includes("rate limit") || data.error.includes("cmon") || data.error.includes("Cmon")) {
      throw new Error("RATE_LIMITED");
    }
    throw new Error(data.error);
  }

  return {
    text: data.text || "",
    actions: data.actions || [],
    needsFollowUp: data.needsFollowUp || false,
  };
}

export async function executeAllActions(actions: AgentAction[]): Promise<string[]> {
  const results: string[] = [];
  for (const action of actions) {
    try {
      const r = await executeAgentAction(action);
      if (r) results.push(r);
    } catch (e: any) {
      results.push(`Failed: ${action.type} — ${e.message}`);
    }
  }
  return results;
}

export async function executeAgentAction(action: AgentAction): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");
  const today = format(new Date(), "yyyy-MM-dd");

  // ── NUTRITION ──
  if (action.type === "nutrition_log") {
    const entries = Array.isArray(action.data?.entries) ? action.data.entries : [action.data];
    for (const e of entries) {
      await addNutritionEntry({
        id: Math.random().toString(36).slice(2),
        date: e.date || today,
        food: e.food || e.name || "Unknown",
        amount: e.amount || "1 serving",
        calories: e.calories || 0,
        protein: e.protein || 0,
        carbs: e.carbs || 0,
        fat: e.fat || 0,
        fiber: e.fiber || 0,
        meal: e.meal || "snack",
        source: "voice" as const,
        timestamp: Date.now(),
      });
    }
    return `Logged ${entries.length} food item${entries.length > 1 ? "s" : ""} ✓`;
  }

  if (action.type === "nutrition_delete") {
    await supabase.from("nutrition_entries").delete().eq("user_id", session.user.id).ilike("food", `%${action.data?.food}%`).eq("date", today);
    return `Removed ${action.data?.food} from log ✓`;
  }

  if (action.type === "macro_targets_update") {
    await updateSettings({ macroTargets: action.data });
    return `Macro targets updated ✓`;
  }

  // ── HYDRATION ──
  if (action.type === "hydration_log") {
    const entries = Array.isArray(action.data?.entries) ? action.data.entries : [action.data];
    for (const e of entries) {
      await supabase.from("hydration_entries").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, amount: e.amount || 250, timestamp: Date.now() });
    }
    const total = entries.reduce((s: number, e: any) => s + (e.amount || 250), 0);
    return `Logged ${total}ml water ✓`;
  }

  if (action.type === "hydration_delete") {
    await supabase.from("hydration_entries").delete().eq("user_id", session.user.id).eq("date", today).limit(1);
    return `Removed hydration entry ✓`;
  }

  // ── SLEEP ──
  if (action.type === "sleep_log") {
    await supabase.from("sleep_entries").upsert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: action.data?.date || today, duration: action.data?.duration || 8, quality: action.data?.quality || 3, bedtime: action.data?.bedtime || "23:00", wake_time: action.data?.wakeTime || "07:00", timestamp: Date.now() });
    return `Sleep logged: ${action.data?.duration}h ✓`;
  }

  // ── STEPS ──
  if (action.type === "steps_log") {
    await supabase.from("step_entries").upsert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, count: action.data?.steps || action.data?.count || 0, timestamp: Date.now() });
    return `Steps logged: ${action.data?.steps || action.data?.count} ✓`;
  }

  // ── TASKS ──
  if (action.type === "task_add") {
    const tasks = Array.isArray(action.data?.tasks) ? action.data.tasks : [action.data];
    for (const t of tasks) {
      await supabase.from("tasks").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: t.date || today, title: t.title || t, completed: false, priority: t.priority || 2, created_at: Date.now() });
    }
    return `Added ${tasks.length} task${tasks.length > 1 ? "s" : ""} ✓`;
  }

  if (action.type === "task_complete") {
    const titles = Array.isArray(action.data?.titles) ? action.data.titles : [action.data?.title];
    for (const title of titles) {
      await supabase.from("tasks").update({ completed: true }).eq("user_id", session.user.id).ilike("title", `%${title}%`).eq("date", today);
    }
    return `Task${titles.length > 1 ? "s" : ""} completed ✓`;
  }

  if (action.type === "task_delete") {
    const titles = Array.isArray(action.data?.titles) ? action.data.titles : [action.data?.title];
    for (const title of titles) {
      await supabase.from("tasks").delete().eq("user_id", session.user.id).ilike("title", `%${title}%`);
    }
    return `Task${titles.length > 1 ? "s" : ""} deleted ✓`;
  }

  if (action.type === "recurring_task_add") {
    const tasks = Array.isArray(action.data?.tasks) ? action.data.tasks : [action.data];
    for (const t of tasks) {
      await supabase.from("recurring_tasks").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, title: t.title, priority: t.priority || 2, frequency: t.frequency || "daily", created_at: Date.now() });
    }
    return `Added ${tasks.length} recurring task${tasks.length > 1 ? "s" : ""} ✓`;
  }

  if (action.type === "recurring_task_delete") {
    await supabase.from("recurring_tasks").delete().eq("user_id", session.user.id).ilike("title", `%${action.data?.title}%`);
    return `Recurring task deleted ✓`;
  }

  // ── WORKOUT ──
  if (action.type === "workout_session_log") {
    await supabase.from("workout_sessions").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, type: action.data?.type || "Custom", duration: action.data?.duration || 45, intensity: action.data?.intensity || 3, exercises: action.data?.exercises || [], timestamp: Date.now() });
    return `Workout logged: ${action.data?.type} ${action.data?.duration}min ✓`;
  }

  if (action.type === "workout_plan_save") {
    await supabase.from("workout_plans").upsert({ id: action.data?.id || Math.random().toString(36).slice(2), user_id: session.user.id, name: action.data?.name, type: action.data?.type || "Push", exercises: action.data?.exercises || [], created_at: Date.now() });
    return `Workout plan "${action.data?.name}" saved ✓`;
  }

  if (action.type === "workout_plan_delete") {
    await supabase.from("workout_plans").delete().eq("user_id", session.user.id).ilike("name", `%${action.data?.name}%`);
    return `Workout plan deleted ✓`;
  }

  // ── FINANCE ──
  if (action.type === "finance_transaction_log") {
    const txns = Array.isArray(action.data?.transactions) ? action.data.transactions : [action.data];
    for (const t of txns) {
      await supabase.from("finance_transactions").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, amount: t.amount || 0, type: t.type || "expense", category: t.category || "other", note: t.note || t.description || "", goal_id: null, timestamp: Date.now() });
    }
    return `Logged ${txns.length} transaction${txns.length > 1 ? "s" : ""} ✓`;
  }

  if (action.type === "finance_transaction_delete") {
    await supabase.from("finance_transactions").delete().eq("user_id", session.user.id).eq("date", today).ilike("note", `%${action.data?.note}%`);
    return `Transaction deleted ✓`;
  }

  if (action.type === "finance_goal_add") {
    const goals = Array.isArray(action.data?.goals) ? action.data.goals : [action.data];
    for (const g of goals) {
      await supabase.from("finance_goals").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, name: g.name, target_amount: g.targetAmount || g.target || 0, current_amount: g.currentAmount || 0, category: g.category || "savings", color: g.color || "#6366f1", created_at: Date.now() });
    }
    return `Created ${goals.length} goal${goals.length > 1 ? "s" : ""} ✓`;
  }

  if (action.type === "finance_goal_update") {
    const goals = Array.isArray(action.data?.goals) ? action.data.goals : [action.data];
    for (const g of goals) {
      const { data: existing } = await supabase.from("finance_goals").select("*").eq("user_id", session.user.id).ilike("name", `%${g.name}%`).single();
      if (existing) {
        const newAmount = g.setAmount !== undefined ? g.setAmount : (existing.current_amount + (g.addAmount || 0) - (g.subtractAmount || 0));
        await supabase.from("finance_goals").update({ current_amount: Math.max(0, newAmount), target_amount: g.targetAmount || existing.target_amount }).eq("id", existing.id);
      }
    }
    return `Goal${goals.length > 1 ? "s" : ""} updated ✓`;
  }

  if (action.type === "finance_goal_delete") {
    const goals = Array.isArray(action.data?.goals) ? action.data.goals : [action.data];
    for (const g of goals) {
      await supabase.from("finance_goals").delete().eq("user_id", session.user.id).ilike("name", `%${g.name || g}%`);
    }
    return `Goal${goals.length > 1 ? "s" : ""} deleted ✓`;
  }

  if (action.type === "finance_split") {
    const { data: { session: s2 } } = await supabase.auth.getSession();
    const { data: goals } = await supabase.from("finance_goals").select("*").eq("user_id", s2?.user.id || session.user.id);
    const splits = action.data?.splits || [];
    for (const split of splits) {
      const goal = (goals || []).find((g: any) => g.name.toLowerCase().includes(split.goalName?.toLowerCase()) || split.goalName?.toLowerCase().includes(g.name.toLowerCase()));
      await supabase.from("finance_transactions").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, amount: split.amount, type: "income", category: "savings", note: `Split to ${split.goalName}`, goal_id: goal?.id ?? null, timestamp: Date.now() });
      if (goal) {
        await supabase.from("finance_goals").update({ current_amount: (goal.current_amount || 0) + split.amount }).eq("id", goal.id);
      }
    }
    return `Split across ${splits.length} goals ✓`;
  }

  // ── BODY WEIGHT ──
  if (action.type === "body_weight_log") {
    await supabase.from("body_weight_entries").insert({ id: Math.random().toString(36).slice(2), user_id: session.user.id, date: today, weight: action.data?.weight, unit: action.data?.unit || "lbs", note: action.data?.note || "", timestamp: Date.now() });
    return `Weight logged: ${action.data?.weight}${action.data?.unit || "lbs"} ✓`;
  }

  if (action.type === "body_weight_delete") {
    await supabase.from("body_weight_entries").delete().eq("user_id", session.user.id).eq("date", today);
    return `Weight entry deleted ✓`;
  }

  // ── SETTINGS ──
  if (action.type === "settings_update") {
    await updateSettings(action.data);
    return `Settings updated ✓`;
  }

  return `Done ✓`;
}

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
    const preferred = voices.find(v => v.name === "Samantha" || v.name.includes("Google US English") || v.name.includes("Google UK English Female") || v.name === "Karen");
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
  ];
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
  const result: { name: string; lang: string; label: string }[] = [];
  for (const nv of NICE_VOICES) {
    const found = voices.find(v => v.name.includes(nv.match));
    if (found) result.push({ name: found.name, lang: found.lang, label: nv.label });
  }
  return result;
}