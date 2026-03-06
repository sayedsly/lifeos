import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const ownerId = process.env.OWNER_USER_ID;
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: { user } } = await adminSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user || user.id !== ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: usage } = await adminSupabase
    .from("ai_usage")
    .select("user_id, date, count, cost_cents, last_query")
    .order("date", { ascending: false });

  const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  (authUsers || []).forEach((u: any) => { emailMap[u.id] = u.email || u.id; });

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const byUser: Record<string, any> = {};
  (usage || []).forEach((row: any) => {
    if (!byUser[row.user_id]) byUser[row.user_id] = {
      email: emailMap[row.user_id] || row.user_id,
      totalCalls: 0, todayCalls: 0, weekCalls: 0, monthCalls: 0,
      totalCostCents: 0, weekCostCents: 0, monthCostCents: 0,
      lastQuery: "", lastDate: "",
    };
    const u = byUser[row.user_id];
    u.totalCalls += row.count;
    u.totalCostCents += row.cost_cents || 0;
    if (row.date === today) u.todayCalls = row.count;
    if (row.date >= weekStart) { u.weekCalls += row.count; u.weekCostCents += row.cost_cents || 0; }
    if (row.date >= monthStart) { u.monthCalls += row.count; u.monthCostCents += row.cost_cents || 0; }
    if (!u.lastDate || row.date > u.lastDate) { u.lastDate = row.date; u.lastQuery = row.last_query || ""; }
  });

  return NextResponse.json({ users: Object.entries(byUser).map(([id, v]) => ({ id, ...v })) });
}

export async function POST(req: NextRequest) {
  const ownerId = process.env.OWNER_USER_ID;
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: { user } } = await adminSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user || user.id !== ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  const today = format(new Date(), "yyyy-MM-dd");
  await adminSupabase.from("ai_usage").update({ count: 0 }).eq("user_id", userId).eq("date", today);
  return NextResponse.json({ success: true });
}