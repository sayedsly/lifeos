import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, message, context } = await req.json();
    if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const today = format(new Date(), "yyyy-MM-dd");

    // Rate limiting: 30 AI calls per user per day
    const DAILY_LIMIT = 30;
    const { data: usageRow } = await userSupabase
      .from("ai_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();
    
    const currentCount = usageRow?.count || 0;
    if (currentCount >= DAILY_LIMIT) {
      return NextResponse.json({ error: "RATE_LIMITED", count: currentCount }, { status: 429 });
    }

    // Log this usage
    if (usageRow) {
      await userSupabase.from("ai_usage").update({ count: currentCount + 1, last_query: message }).eq("id", usageRow.id);
    } else {
      await userSupabase.from("ai_usage").insert({ id: Math.random().toString(36).slice(2), user_id: userId, date: today, count: 1, last_query: message, cost_cents: 0 });
    }
    const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

    const [
      { data: snapshots },
      { data: nutrition },
      { data: sleep },
      { data: hydration },
      { data: steps },
      { data: workouts },
      { data: tasks },
      { data: settingsRow },
      { data: financeGoals },
      { data: financeTransactions },
    ] = await Promise.all([
      userSupabase.from("momentum_snapshots").select("date,score,breakdown").eq("user_id", userId).gte("date", weekAgo).order("date"),
      userSupabase.from("nutrition_entries").select("date,calories,protein,carbs,fat,fiber,food,meal").eq("user_id", userId).gte("date", weekAgo).order("timestamp", { ascending: false }),
      userSupabase.from("sleep_entries").select("date,duration,quality").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("hydration_entries").select("date,amount").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("step_entries").select("date,count").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("workout_sessions").select("date,type,duration,intensity,exercises").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("tasks").select("date,title,completed,priority").eq("user_id", userId).eq("date", today),
      userSupabase.from("user_settings").select("*").eq("user_id", userId).single(),
      userSupabase.from("finance_goals").select("*").eq("user_id", userId),
      userSupabase.from("finance_transactions").select("*").eq("user_id", userId).gte("date", weekAgo),
    ]);

    const s = settingsRow || {};
    const goals = {
      calories: s.macro_targets?.calories || 2000,
      protein: s.macro_targets?.protein || 150,
      carbs: s.macro_targets?.carbs || 250,
      fat: s.macro_targets?.fat || 65,
      hydration: s.hydration_goal || 2500,
      sleep: s.sleep_goal || 8,
      steps: s.step_goal || 10000,
    };

    // Today's nutrition
    const todayNutrition = (nutrition || []).filter(n => n.date === today);
    const todayTotals = todayNutrition.reduce((acc, n) => ({
      calories: acc.calories + (n.calories || 0),
      protein: acc.protein + (n.protein || 0),
      carbs: acc.carbs + (n.carbs || 0),
      fat: acc.fat + (n.fat || 0),
      fiber: acc.fiber + (n.fiber || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    // Week nutrition averages
    const nutritionByDay: Record<string, any> = {};
    (nutrition || []).forEach(n => {
      if (!nutritionByDay[n.date]) nutritionByDay[n.date] = { calories: 0, protein: 0 };
      nutritionByDay[n.date].calories += n.calories || 0;
      nutritionByDay[n.date].protein += n.protein || 0;
    });
    const nutritionDays = Object.values(nutritionByDay);
    const avgCalories = nutritionDays.length ? Math.round(nutritionDays.reduce((a, d) => a + d.calories, 0) / nutritionDays.length) : 0;

    // Today's steps and hydration
    const todaySteps = (steps || []).find(s => s.date === today)?.count || 0;
    const todayHydration = (hydration || []).filter(h => h.date === today).reduce((a, h) => a + h.amount, 0);
    const todaySleep = (sleep || []).find(s => s.date === today);

    // Finance
    const financeGoalsSummary = (financeGoals || []).map((g: any) => {
      const saved = (financeTransactions || []).filter((t: any) => t.goal_id === g.id).reduce((a: number, t: any) => a + t.amount, 0);
      return { name: g.name, target: g.target, saved, remaining: Math.max(g.target - saved, 0), pct: Math.round((saved / g.target) * 100) };
    });

    const dataContext = `
TODAY (${today}):
- Calories eaten: ${Math.round(todayTotals.calories)} / ${goals.calories} kcal (${Math.round(goals.calories - todayTotals.calories)} remaining)
- Protein: ${Math.round(todayTotals.protein)}g / ${goals.protein}g
- Carbs: ${Math.round(todayTotals.carbs)}g / ${goals.carbs}g
- Fat: ${Math.round(todayTotals.fat)}g / ${goals.fat}g
- Water: ${todayHydration}ml / ${goals.hydration}ml
- Steps: ${todaySteps.toLocaleString()} / ${goals.steps.toLocaleString()}
- Sleep last night: ${todaySleep ? todaySleep.duration + "h (quality " + todaySleep.quality + "/5)" : "not logged"}
- Today's foods logged: ${todayNutrition.map(n => n.food + " (" + n.meal + ", " + n.calories + "cal)").join(", ") || "none"}
- Today's tasks: ${(tasks || []).map(t => (t.completed ? "✓" : "○") + " " + t.title).join(", ") || "none"}

THIS WEEK AVERAGES:
- Avg calories/day: ${avgCalories}
- Avg steps/day: ${steps?.length ? Math.round((steps || []).reduce((a, s) => a + s.count, 0) / steps.length) : 0}
- Workouts: ${(workouts || []).length} sessions (${Array.from(new Set((workouts || []).map((w: any) => w.type))).join(", ") || "none"})
- Avg sleep: ${sleep?.length ? ((sleep || []).reduce((a, s) => a + s.duration, 0) / sleep.length).toFixed(1) : 0}h

USER GOALS:
- Daily calories: ${goals.calories} kcal
- Daily protein: ${goals.protein}g
- Daily steps: ${goals.steps.toLocaleString()}
- Daily water: ${goals.hydration}ml
- Sleep goal: ${goals.sleep}h

FINANCE GOALS:
${financeGoalsSummary.map(g => `- ${g.name}: $${g.saved} saved of $${g.target} target (${g.pct}%, $${g.remaining} remaining)`).join("\n") || "No goals set"}
`;

    const systemPrompt = `You are a personal AI health and life coach inside LifeOS, a habit tracking app. You have access to the user's real data and must give specific, actionable advice based on it.

IMPORTANT: When the user asks you to DO something (log food, create a workout, split money between goals, set macros, etc.), respond with a JSON action block in addition to your text. Format it EXACTLY like this at the end of your response:

ACTION:{"type":"nutrition_log","data":{"food":"2 eggs","calories":140,"protein":12,"carbs":0,"fat":10,"meal":"snack"}}
or
ACTION:{"type":"workout_plan","data":{"name":"Push Day","type":"Push","exercises":[{"name":"Bench Press","sets":4,"reps":8,"weight":135},{"name":"Shoulder Press","sets":3,"reps":10,"weight":65}]}}
or  
ACTION:{"type":"finance_split","data":{"splits":[{"goalName":"Emergency Fund","amount":300},{"goalName":"Vacation","amount":200}]}}
or
ACTION:{"type":"macro_targets","data":{"calories":2200,"protein":175,"carbs":220,"fat":70}}
or
ACTION:{"type":"none"}

For purely informational questions, just answer and end with ACTION:{"type":"none"}

Keep responses concise (under 150 words), warm, specific to their data. Use their actual numbers.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${dataContext}\n\nUser says: "${message}"` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn\'t process that.";

    // Parse action if present
    let action = null;
    let text = raw;
    const actionMarker = "ACTION:";
    const markerIdx = raw.lastIndexOf(actionMarker);
    if (markerIdx >= 0) {
      const jsonStr = raw.slice(markerIdx + actionMarker.length).trim();
      try {
        // Find matching braces
        let depth = 0, end = -1;
        for (let i = 0; i < jsonStr.length; i++) {
          if (jsonStr[i] === "{") depth++;
          else if (jsonStr[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end >= 0) action = JSON.parse(jsonStr.slice(0, end + 1));
      } catch (e) { console.error("Action parse error:", e); }
      text = raw.slice(0, markerIdx).trim();
    }
    if (!text) text = raw;

    // Rough cost estimate: ~500 input tokens + ~200 output tokens per call
    const estimatedCostCents = Math.round((500 * 0.075 + 200 * 0.30) / 1000 * 100) / 100;
    await userSupabase.from("ai_usage")
      .update({ cost_cents: ((usageRow?.cost_cents || 0) + estimatedCostCents) })
      .eq("user_id", userId)
      .eq("date", today);

    return NextResponse.json({ text, action, generatedAt: new Date().toISOString(), remainingCalls: DAILY_LIMIT - currentCount - 1 });
  } catch (e: any) {
    console.error("Agent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}