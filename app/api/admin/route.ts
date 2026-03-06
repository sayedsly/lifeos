import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const ownerId = process.env.OWNER_USER_ID;
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify caller is owner
  const { data: { user } } = await adminSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user || user.id !== ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all usage data
  const { data: usage } = await adminSupabase
    .from("ai_usage")
    .select("user_id, date, count, cost_cents, last_query")
    .order("date", { ascending: false });

  // Get user emails from auth
  const { data: { users } } = await adminSupabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  (users || []).forEach(u => { emailMap[u.id] = u.email || u.id; });

  // Aggregate by user
  const byUser: Record<string, { email: string; totalCalls: number; todayCalls: number; totalCostCents: number; lastQuery: string; lastDate: string }> = {};
  const today = format(new Date(), "yyyy-MM-dd");
  
  (usage || []).forEach(row => {
    if (!byUser[row.user_id]) byUser[row.user_id] = { email: emailMap[row.user_id] || row.user_id, totalCalls: 0, todayCalls: 0, totalCostCents: 0, lastQuery: "", lastDate: "" };
    byUser[row.user_id].totalCalls += row.count;
    byUser[row.user_id].totalCostCents += row.cost_cents || 0;
    if (row.date === today) byUser[row.user_id].todayCalls = row.count;
    if (!byUser[row.user_id].lastDate || row.date > byUser[row.user_id].lastDate) {
      byUser[row.user_id].lastDate = row.date;
      byUser[row.user_id].lastQuery = row.last_query || "";
    }
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