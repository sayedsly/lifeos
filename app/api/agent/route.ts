import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

const DAILY_LIMIT = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, message, history } = await req.json();
    if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

    // Rate limiting
    const { data: usageRow } = await userSupabase.from("ai_usage").select("*").eq("user_id", userId).eq("date", today).single();
    const currentCount = usageRow?.count || 0;
    if (currentCount >= DAILY_LIMIT) return NextResponse.json({ error: "Cmon bro, chill — hit up Sayed to reset" }, { status: 429 });
    if (usageRow) await userSupabase.from("ai_usage").update({ count: currentCount + 1, last_query: message }).eq("id", usageRow.id);
    else await userSupabase.from("ai_usage").insert({ id: Math.random().toString(36).slice(2), user_id: userId, date: today, count: 1, last_query: message, cost_cents: 0 });

    // Fetch all user data
    const [
      { data: momentum }, { data: nutrition }, { data: sleep },
      { data: hydration }, { data: steps }, { data: workouts },
      { data: tasks }, { data: settingsRow }, { data: financeGoals },
      { data: transactions }, { data: bodyWeight }, { data: recurringTasks },
    ] = await Promise.all([
      userSupabase.from("momentum_snapshots").select("date,score,breakdown").eq("user_id", userId).gte("date", weekAgo).order("date"),
      userSupabase.from("nutrition_entries").select("date,calories,protein,carbs,fat,fiber,food,meal").eq("user_id", userId).gte("date", weekAgo).order("timestamp", { ascending: false }),
      userSupabase.from("sleep_entries").select("date,duration,quality").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("hydration_entries").select("date,amount").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("step_entries").select("date,count").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("workout_sessions").select("date,type,duration,intensity,exercises").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("tasks").select("date,title,completed,priority").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("user_settings").select("*").eq("user_id", userId).single(),
      userSupabase.from("finance_goals").select("*").eq("user_id", userId),
      userSupabase.from("finance_transactions").select("*").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("body_weight_entries").select("date,weight,unit").eq("user_id", userId).order("timestamp", { ascending: false }).limit(10),
      userSupabase.from("recurring_tasks").select("*").eq("user_id", userId),
    ]);

    const s = settingsRow || {};
    const userGoals = {
      calories: s.macro_targets?.calories || 2000,
      protein: s.macro_targets?.protein || 150,
      carbs: s.macro_targets?.carbs || 250,
      fat: s.macro_targets?.fat || 65,
      hydration: s.hydration_goal || 2500,
      sleep: s.sleep_goal || 8,
      steps: s.step_goal || 10000,
    };

    const todayNutrition = (nutrition || []).filter((n: any) => n.date === today);
    const totalCals = todayNutrition.reduce((s: number, n: any) => s + (n.calories || 0), 0);
    const totalProtein = todayNutrition.reduce((s: number, n: any) => s + (n.protein || 0), 0);
    const todayHydration = (hydration || []).filter((h: any) => h.date === today).reduce((s: number, h: any) => s + (h.amount || 0), 0);
    const todaySteps = (steps || []).find((s: any) => s.date === today)?.count || 0;
    const todayTasks = (tasks || []).filter((t: any) => t.date === today);
    const latestWeight = bodyWeight?.[0];

    const dataContext = `
TODAY (${today}):
- Calories: ${totalCals}/${userGoals.calories} kcal | Protein: ${totalProtein}g/${userGoals.protein}g
- Hydration: ${todayHydration}ml/${userGoals.hydration}ml
- Steps: ${todaySteps}/${userGoals.steps}
- Tasks today: ${todayTasks.map((t: any) => `${t.title}(${t.completed ? "done" : "pending"})`).join(", ") || "none"}
- Meals logged: ${todayNutrition.map((n: any) => `${n.food}(${n.calories}cal,${n.meal})`).join(", ") || "none"}

THIS WEEK:
- Workouts: ${(workouts || []).length} sessions — ${(workouts || []).map((w: any) => `${w.date}:${w.type}(${w.duration}min)`).join(", ") || "none"}
- Sleep: ${(sleep || []).map((s: any) => `${s.date}:${s.duration}h`).join(", ") || "none"}
- Momentum scores: ${(momentum || []).map((m: any) => `${m.date}:${m.score}`).join(", ") || "none"}

FINANCE:
- Goals: ${(financeGoals || []).map((g: any) => `${g.name}($${g.current_amount}/$${g.target_amount})`).join(", ") || "none"}
- Recent transactions: ${(transactions || []).slice(0, 10).map((t: any) => `${t.date}:${t.type}$${t.amount}(${t.category})`).join(", ") || "none"}

BODY & SETTINGS:
- Latest weight: ${latestWeight ? `${latestWeight.weight}${latestWeight.unit} on ${latestWeight.date}` : "not logged"}
- Goals: ${JSON.stringify(userGoals)}
- Recurring tasks: ${(recurringTasks || []).map((t: any) => t.title).join(", ") || "none"}
`;

    const historyContext = history && history.length > 0
      ? "\n\nCONVERSATION HISTORY (same session — continue this thread):\n" + history.slice(-8).map((m: any) => `${m.role === "user" ? "User" : "You"}: ${m.text}`).join("\n")
      : "";

    const systemPrompt = `You are the LifeOS AI — a personal optimization coach with FULL ability to read and modify every module in the app.

You can perform ANY of these actions by returning them in ACTIONS array:
- nutrition_log: {"entries":[{"food":"chicken","calories":300,"protein":30,"carbs":5,"fat":8,"meal":"lunch"}]}
- nutrition_delete: {"food":"pizza"}
- macro_targets_update: {"calories":2200,"protein":160,"carbs":240,"fat":70}
- hydration_log: {"entries":[{"amount":500}]}
- sleep_log: {"duration":7.5,"quality":4,"bedtime":"23:00","wakeTime":"06:30"}
- steps_log: {"steps":8000}
- task_add: {"tasks":[{"title":"Buy groceries","priority":2}]}
- task_complete: {"titles":["Buy groceries"]}
- task_delete: {"titles":["Old task"]}
- recurring_task_add: {"tasks":[{"title":"Morning walk","frequency":"daily","priority":2}]}
- recurring_task_delete: {"title":"Morning walk"}
- workout_session_log: {"type":"Push","duration":54,"intensity":4,"exercises":[{"name":"Bench Press","sets":4,"reps":8,"weight":135}]}
- workout_plan_save: {"name":"My Push Day","type":"Push","exercises":[]}
- workout_plan_delete: {"name":"Old Plan"}
- finance_transaction_log: {"transactions":[{"amount":50,"type":"expense","category":"food","note":"lunch"}]}
- finance_transaction_delete: {"note":"lunch"}
- finance_goal_add: {"goals":[{"name":"Japan Trip","targetAmount":5000,"category":"savings"}]}
- finance_goal_update: {"goals":[{"name":"Japan","addAmount":500}]} or {"goals":[{"name":"Japan","subtractAmount":200}]} or {"goals":[{"name":"Japan","setAmount":1000}]}
- finance_goal_delete: {"goals":[{"name":"Japan"}]}
- finance_split: {"splits":[{"goalName":"Japan","amount":333},{"goalName":"Mortgage","amount":333}]}
- body_weight_log: {"weight":165,"unit":"lbs"}
- settings_update: {"step_goal":12000} or {"sleep_goal":8} or {"hydration_goal":3000}

RULES:
- ALWAYS return complete responses, never cut off mid-sentence
- For multi-step requests, return ALL actions needed in the actions array
- If request is ambiguous, make your best assumption and state it
- Never ask for follow-up info — if you need more, say "Try again with: [exact example]"
- If your response ends with a question for clarification, set needsFollowUp: true
- Keep responses under 180 words, warm and direct
- Use the user's actual data numbers in responses

Return format (STRICT — always valid JSON at end):
ACTIONS:[{"type":"action_type","data":{...}},{"type":"action_type2","data":{...}}]
FOLLOWUP:true or FOLLOWUP:false`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + dataContext + historyContext + "\n\nUser says: " + message }] }],
          generationConfig: { maxOutputTokens: 2500, temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse ACTIONS and FOLLOWUP from response
    let actions: any[] = [];
    let needsFollowUp = false;
    let text = raw;

    const actionsIdx = raw.indexOf("ACTIONS:");
    const actionsMatch = actionsIdx >= 0 ? [null, raw.slice(actionsIdx + 8).trim().split("\nFOLLOWUP:")[0].trim()] : null;
    const followupMatch = raw.match(/FOLLOWUP:\s*(true|false)/i);

    if (actionsMatch) {
      try {
        const parsed = JSON.parse(actionsMatch[1]);
        actions = Array.isArray(parsed) ? parsed.filter((a: any) => a.type !== "none") : [];
      } catch (e) { console.error("Actions parse error:", e); }
      text = raw.slice(0, raw.indexOf("ACTIONS:")).trim();
    }

    if (followupMatch) {
      needsFollowUp = followupMatch[1].toLowerCase() === "true";
      if (!actionsMatch) text = raw.slice(0, raw.indexOf("FOLLOWUP:")).trim();
    }

    if (!text) text = raw;

    const estimatedCostCents = Math.round((500 * 0.075 + 300 * 0.30) / 1000 * 100) / 100;
    await userSupabase.from("ai_usage").update({ cost_cents: ((usageRow?.cost_cents || 0) + estimatedCostCents) }).eq("user_id", userId).eq("date", today);

    return NextResponse.json({ text, actions, needsFollowUp, remainingCalls: DAILY_LIMIT - currentCount - 1 });
  } catch (e: any) {
    console.error("Agent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}