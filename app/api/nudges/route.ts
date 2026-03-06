import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const accessToken = req.nextUrl.searchParams.get("accessToken");
  if (!userId || !accessToken) return NextResponse.json({ nudges: [] });

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const nudges: { type: string; message: string; emoji: string; action?: string }[] = [];

  // Check sleep - not logged today or yesterday
  const { data: sleepToday } = await userSupabase.from("sleep_entries").select("id").eq("user_id", userId).eq("date", today);
  const { data: sleepYest } = await userSupabase.from("sleep_entries").select("id").eq("user_id", userId).eq("date", yesterday);
  if (!sleepToday?.length && !sleepYest?.length) {
    nudges.push({ type: "sleep", emoji: "😴", message: "You haven\'t logged sleep in 2+ days", action: "/" });
  }

  // Check hydration - less than 1000ml today
  const { data: hydration } = await userSupabase.from("hydration_entries").select("amount").eq("user_id", userId).eq("date", today);
  const totalHydration = (hydration || []).reduce((s: number, h: any) => s + (h.amount || 0), 0);
  if (totalHydration < 1000 && new Date().getHours() >= 14) {
    nudges.push({ type: "hydration", emoji: "💧", message: `Only ${totalHydration}ml water today — drink up!`, action: "/" });
  }

  // Check nutrition - not logged today
  const { data: nutrition } = await userSupabase.from("nutrition_entries").select("id").eq("user_id", userId).eq("date", today);
  if (!nutrition?.length && new Date().getHours() >= 13) {
    nudges.push({ type: "nutrition", emoji: "🍽️", message: "No meals logged today yet", action: "/nutrition" });
  }

  // Check tasks - incomplete tasks from yesterday
  const { data: oldTasks } = await userSupabase.from("tasks").select("title").eq("user_id", userId).eq("date", yesterday).eq("completed", false).eq("recurring", false);
  if (oldTasks && oldTasks.length > 0) {
    nudges.push({ type: "tasks", emoji: "✅", message: `${oldTasks.length} task${oldTasks.length > 1 ? "s" : ""} left unfinished yesterday`, action: "/tasks" });
  }

  // Check workout - no workout in 3+ days
  const threeDaysAgo = format(subDays(new Date(), 3), "yyyy-MM-dd");
  const { data: recentWorkouts } = await userSupabase.from("workout_sessions").select("id").eq("user_id", userId).gte("date", threeDaysAgo);
  if (!recentWorkouts?.length) {
    nudges.push({ type: "workout", emoji: "💪", message: "No workout in 3+ days — time to move!", action: "/workout" });
  }

  return NextResponse.json({ nudges: nudges.slice(0, 3) }); // max 3 nudges
}
