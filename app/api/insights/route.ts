import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken } = await req.json();
    if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use user's access token for RLS
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

    // Fetch all week data in parallel
    const [
      { data: snapshots },
      { data: nutrition },
      { data: sleep },
      { data: hydration },
      { data: steps },
      { data: workouts },
      { data: tasks },
      { data: settings },
    ] = await Promise.all([
      userSupabase.from("momentum_snapshots").select("date, score, breakdown").eq("user_id", userId).gte("date", weekAgo).order("date"),
      userSupabase.from("nutrition_entries").select("date, calories, protein, carbs, fat").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("sleep_entries").select("date, duration, quality").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("hydration_entries").select("date, amount").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("step_entries").select("date, count").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("workout_sessions").select("date, type, duration, intensity, completed").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("tasks").select("date, completed, priority").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("user_settings").select("*").eq("user_id", userId).single(),
    ]);

    // Aggregate nutrition by day
    const nutritionByDay: Record<string, { calories: number; protein: number }> = {};
    (nutrition || []).forEach(n => {
      if (!nutritionByDay[n.date]) nutritionByDay[n.date] = { calories: 0, protein: 0 };
      nutritionByDay[n.date].calories += n.calories || 0;
      nutritionByDay[n.date].protein += n.protein || 0;
    });

    const hydrationByDay: Record<string, number> = {};
    (hydration || []).forEach(h => {
      hydrationByDay[h.date] = (hydrationByDay[h.date] || 0) + h.amount;
    });

    const s = settings?.data || settings || {};
    const goals = {
      calories: s.macro_targets?.calories || 2000,
      protein: s.macro_targets?.protein || 150,
      hydration: s.hydration_goal || 2500,
      sleep: s.sleep_goal || 8,
      steps: s.step_goal || 10000,
    };

    // Build summary
    const scores = (snapshots || []).map(s => s.score);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const daysLogged = scores.filter(s => s > 0).length;

    const sleepEntries = sleep || [];
    const avgSleep = sleepEntries.length ? (sleepEntries.reduce((a, s) => a + s.duration, 0) / sleepEntries.length).toFixed(1) : "0";
    const avgQuality = sleepEntries.length ? (sleepEntries.reduce((a, s) => a + (s.quality || 0), 0) / sleepEntries.length).toFixed(1) : "0";

    const stepEntries = steps || [];
    const avgSteps = stepEntries.length ? Math.round(stepEntries.reduce((a, s) => a + s.count, 0) / stepEntries.length) : 0;
    const stepGoalDays = stepEntries.filter(s => s.count >= goals.steps).length;

    const workoutEntries = (workouts || []).filter(w => w.completed);
    const totalWorkouts = workoutEntries.length;
    const workoutTypes = workoutEntries.map(w => w.type).join(", ") || "none";

    const taskEntries = tasks || [];
    const completedTasks = taskEntries.filter(t => t.completed).length;
    const totalTasks = taskEntries.length;

    const nutritionDays = Object.keys(nutritionByDay).length;
    const calGoalDays = Object.values(nutritionByDay).filter(n => n.calories >= goals.calories * 0.8).length;
    const protGoalDays = Object.values(nutritionByDay).filter(n => n.protein >= goals.protein * 0.8).length;

    const hydGoalDays = Object.values(hydrationByDay).filter(v => v >= goals.hydration).length;

    const weekSummary = `
User's week summary (last 7 days):
- Days logged: ${daysLogged}/7
- Average momentum score: ${avgScore}/100
- Momentum scores by day: ${scores.join(", ") || "none"}

Sleep:
- Average duration: ${avgSleep} hours (goal: ${goals.sleep}h)
- Average quality: ${avgQuality}/5
- Entries logged: ${sleepEntries.length} days

Nutrition:
- Days with food logged: ${nutritionDays}/7
- Days hitting calorie goal (80%+): ${calGoalDays}/${nutritionDays}
- Days hitting protein goal (80%+): ${protGoalDays}/${nutritionDays}
- Calorie goal: ${goals.calories} kcal, Protein goal: ${goals.protein}g

Hydration:
- Days hitting water goal: ${hydGoalDays}/7 (goal: ${goals.hydration}ml)

Steps:
- Average steps: ${avgSteps.toLocaleString()} (goal: ${goals.steps.toLocaleString()})
- Days hitting step goal: ${stepGoalDays}/7

Workouts:
- Total sessions completed: ${totalWorkouts}
- Types: ${workoutTypes}

Tasks:
- Completed: ${completedTasks}/${totalTasks} tasks
`;

    // Call Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: `You are a personal life coach inside a habit tracking app called LifeOS. You analyze the user's weekly data and give concise, honest, motivating insights. Be direct and specific — reference their actual numbers. Highlight what's working, what needs work, and give 1-2 concrete actionable tips. Keep it under 200 words. Use a warm but no-nonsense tone. Format with short paragraphs, no bullet points, no headers.`,
        messages: [{ role: "user", content: `Here is my week:\n${weekSummary}\n\nGive me my weekly insight.` }],
      }),
    });

    const claudeData = await claudeRes.json();
    const insight = claudeData.content?.[0]?.text || "Unable to generate insight.";

    // Log token usage
    if (claudeData.usage?.output_tokens) {
      await userSupabase.from("user_settings")
        .update({ tokens_used: (s.tokens_used || 0) + claudeData.usage.output_tokens })
        .eq("user_id", userId);
    }

    return NextResponse.json({ insight, generatedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("Insights error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
