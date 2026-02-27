import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncData(token: string, steps: any, sleep_hours: any, date: string) {
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("webhook_token", token)
    .single();

  if (!settings) return { error: "Invalid token" };

  const userId = settings.user_id;
  const synced: string[] = [];

  if (steps !== undefined && steps !== null && steps !== "") {
    const stepsNum = Math.round(parseFloat(steps) || 0);
    await supabase.from("step_entries").upsert({
      id: `steps-${userId}-${date}`,
      user_id: userId,
      date,
      count: stepsNum,
    });
    await supabase.from("health_sync_log").insert({
      id: `${Date.now()}-steps-${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      source: "apple_health",
      data_type: "steps",
      value: stepsNum,
      date,
      synced_at: Date.now(),
    });
    synced.push("steps");
  }

  if (sleep_hours !== undefined && sleep_hours !== null && sleep_hours !== "") {
    const sleepNum = Math.round(parseFloat(sleep_hours) * 10) / 10;
    await supabase.from("sleep_entries").upsert({
      id: `sleep-${userId}-${date}`,
      user_id: userId,
      date,
      duration: sleepNum,
      quality: 3,
      timestamp: Date.now(),
    });
    await supabase.from("health_sync_log").insert({
      id: `${Date.now()}-sleep-${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      source: "apple_health",
      data_type: "sleep",
      value: sleepNum,
      date,
      synced_at: Date.now(),
    });
    synced.push("sleep");
  }

  return { success: true, synced, date };
}

// GET - used by Shortcuts (more reliable than POST)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = p.get("token");
  const steps = p.get("steps");
  const sleep_hours = p.get("sleep");
  const date = p.get("date") || format(new Date(), "yyyy-MM-dd");

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const result = await syncData(token, steps, sleep_hours, date);
  return NextResponse.json(result);
}

// POST - used by curl/manual
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, steps, sleep_hours, date } = body;
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    const result = await syncData(token, steps, sleep_hours, date || format(new Date(), "yyyy-MM-dd"));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
