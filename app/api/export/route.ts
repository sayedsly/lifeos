import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") || "nutrition";
  const userId = searchParams.get("userId");
  const accessToken = searchParams.get("accessToken");
  const days = parseInt(searchParams.get("days") || "30");

  if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const since = format(subDays(new Date(), days), "yyyy-MM-dd");

  const TABLE_MAP: Record<string, { table: string; cols: string }> = {
    nutrition: { table: "nutrition_entries", cols: "date,food,calories,protein,carbs,fat,fiber,meal" },
    sleep: { table: "sleep_entries", cols: "date,duration,quality,bedtime,wake_time" },
    hydration: { table: "hydration_entries", cols: "date,amount" },
    steps: { table: "step_entries", cols: "date,count" },
    workouts: { table: "workout_sessions", cols: "date,type,duration,intensity,completed" },
    weight: { table: "body_weight_entries", cols: "date,weight,unit,note" },
    tasks: { table: "tasks", cols: "date,title,completed,priority" },
    finance: { table: "finance_transactions", cols: "date,amount,type,category,description" },
    mood: { table: "mood_entries", cols: "date,mood,note" },
  };

  const cfg = TABLE_MAP[domain];
  if (!cfg) return NextResponse.json({ error: "Unknown domain" }, { status: 400 });

  const { data, error } = await supabase
    .from(cfg.table)
    .select(cfg.cols)
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) return new NextResponse("No data found", { status: 404 });

  const cols = cfg.cols.split(",");
  const csv = [
    cols.join(","),
    ...(data as any[]).map(row => cols.map(c => {
      const val = row[c] ?? "";
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    }).join(","))
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="lifeos-${domain}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    }
  });
}
