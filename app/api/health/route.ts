import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, steps, sleep_hours, sleep_quality, date } = body;

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    // Find user by webhook token
    const { data: settings } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("webhook_token", token)
      .single();

    if (!settings) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const userId = settings.user_id;
    const targetDate = date || format(new Date(), "yyyy-MM-dd");
    const synced: string[] = [];

    // Sync steps
    if (steps !== undefined && steps !== null) {
      await supabase.from("step_entries").upsert({
        id: `steps-${userId}-${targetDate}`,
        user_id: userId,
        date: targetDate,
        count: Math.round(steps),
      });
      await supabase.from("health_sync_log").insert({
        id: `${Date.now()}-steps`,
        user_id: userId,
        source: "apple_health",
        data_type: "steps",
        value: steps,
        date: targetDate,
        synced_at: Date.now(),
      });
      synced.push("steps");
    }

    // Sync sleep
    if (sleep_hours !== undefined && sleep_hours !== null) {
      const sleepId = `sleep-${userId}-${targetDate}`;
      await supabase.from("sleep_entries").upsert({
        id: sleepId,
        user_id: userId,
        date: targetDate,
        duration: Math.round(sleep_hours * 10) / 10,
        quality: sleep_quality || 3,
        timestamp: Date.now(),
      });
      await supabase.from("health_sync_log").insert({
        id: `${Date.now()}-sleep`,
        user_id: userId,
        source: "apple_health",
        data_type: "sleep",
        value: sleep_hours,
        date: targetDate,
        synced_at: Date.now(),
      });
      synced.push("sleep");
    }

    // Recompute momentum
    if (synced.length > 0) {
      const { data: snap } = await supabase
        .from("momentum_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("date", targetDate)
        .single();

      if (snap) {
        // Trigger recompute via internal flag — momentum will be recomputed next time user opens app
        await supabase.from("momentum_snapshots")
          .update({ score: -1 }) // flag for recompute
          .eq("user_id", userId)
          .eq("date", targetDate);
      }
    }

    return NextResponse.json({ success: true, synced, date: targetDate });
  } catch (e: any) {
    console.error("Health sync error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
