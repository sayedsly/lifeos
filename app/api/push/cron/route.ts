import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const DOMAIN_URLS: Record<string, string> = {
  nutrition: "/nutrition", hydration: "/", sleep: "/",
  steps: "/", tasks: "/tasks", workout: "/workout",
  finance: "/finance", momentum: "/",
};

async function getSmartNudge(userId: string, domain: string, today: string): Promise<string | null> {
  const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", userId).single();
  const s = settings || {};

  if (domain === "nutrition") {
    const { data: entries } = await supabase.from("nutrition_entries").select("calories").eq("user_id", userId).eq("date", today);
    const total = (entries || []).reduce((sum: number, e: any) => sum + (e.calories || 0), 0);
    const goal = s.macro_targets?.calories || 2000;
    if (total === 0) return "Nothing logged today 🍽️ Don't forget to track your meals";
    if (total < goal * 0.4) return `Only ${total} / ${goal} kcal logged — you're way behind on calories 🔥`;
    if (total >= goal * 0.95) return `Almost at your ${goal} kcal goal! ${total} logged so far 🎯`;
    return `${total} / ${goal} kcal logged — keep it up 💪`;
  }

  if (domain === "hydration") {
    const { data: entries } = await supabase.from("hydration_entries").select("amount").eq("user_id", userId).eq("date", today);
    const total = (entries || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const goal = s.hydration_goal || 2500;
    if (total === 0) return "Haven't logged any water today 💧 Start hydrating!";
    const remaining = goal - total;
    if (remaining <= 0) return `Hydration goal crushed! ${total}ml logged 💦`;
    return `${total}ml / ${goal}ml — ${remaining}ml left to drink 💧`;
  }

  if (domain === "steps") {
    const { data: entry } = await supabase.from("step_entries").select("count").eq("user_id", userId).eq("date", today).single();
    const count = entry?.count || 0;
    const goal = s.step_goal || 10000;
    if (count === 0) return "No steps logged yet today 👟 Get moving!";
    if (count >= goal) return `Step goal smashed! ${count.toLocaleString()} steps today 🏆`;
    return `${count.toLocaleString()} / ${goal.toLocaleString()} steps — ${(goal - count).toLocaleString()} to go 🚶`;
  }

  if (domain === "workout") {
    const { data: sessions } = await supabase.from("workout_sessions").select("id").eq("user_id", userId).eq("date", today);
    if (!sessions || sessions.length === 0) return "No workout logged today 💪 Still time to get it in!";
    return null; // already worked out, skip nudge
  }

  if (domain === "sleep") {
    const { data: entry } = await supabase.from("sleep_entries").select("duration").eq("user_id", userId).eq("date", today).single();
    if (!entry) return "Don't forget to log your sleep tonight 😴 Consistency matters";
    const goal = s.sleep_goal || 8;
    if (entry.duration < goal - 1) return `Only ${entry.duration}h logged — you're ${(goal - entry.duration).toFixed(1)}h short of your goal 😴`;
    return null;
  }

  if (domain === "tasks") {
    const { data: tasks } = await supabase.from("tasks").select("completed").eq("user_id", userId).eq("date", today);
    if (!tasks || tasks.length === 0) return "No tasks for today — add some and stay on track ✅";
    const pending = tasks.filter((t: any) => !t.completed).length;
    const done = tasks.filter((t: any) => t.completed).length;
    if (pending === 0) return `All ${done} tasks done today — you're crushing it! 🎉`;
    return `${pending} task${pending > 1 ? "s" : ""} still pending today ✅ Let's finish strong`;
  }

  if (domain === "finance") {
    const { data: txns } = await supabase.from("finance_transactions").select("amount").eq("user_id", userId).eq("date", today).eq("type", "expense");
    if (!txns || txns.length === 0) return "No expenses logged today 💰 Spent anything?";
    const total = txns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    return `$${total.toFixed(0)} in expenses logged today 💸 Staying on budget?`;
  }

  if (domain === "momentum") {
    const { data: snap } = await supabase.from("momentum_snapshots").select("score").eq("user_id", userId).eq("date", today).single();
    if (!snap) return "Check your momentum score for today ⚡";
    if (snap.score >= 80) return `Momentum score: ${snap.score} today 🔥 Elite performance!`;
    if (snap.score >= 50) return `Momentum score: ${snap.score} today — solid, push for more ⚡`;
    return `Momentum score: ${snap.score} today 📊 Let's turn it around`;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = format(now, "yyyy-MM-dd");

  const { data: prefs } = await supabase.from("notification_preferences").select("*");
  if (!prefs || prefs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const pref of prefs) {
    const { user_id, domain, enabled, times } = pref;
    if (!enabled || !times || times.length === 0) continue;

    const shouldSend = times.some((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const [ch, cm] = currentTime.split(":").map(Number);
      return Math.abs((h * 60 + m) - (ch * 60 + cm)) <= 7;
    });
    if (!shouldSend) continue;

    const timeSlot = currentTime.slice(0, 4) + "0";
    const { data: alreadySent } = await supabase
      .from("notification_log").select("id")
      .eq("user_id", user_id).eq("domain", domain)
      .eq("date", today).eq("time_slot", timeSlot);
    if (alreadySent && alreadySent.length > 0) continue;

    const { data: subData } = await supabase
      .from("push_subscriptions").select("subscription")
      .eq("user_id", user_id).single();
    if (!subData) continue;

    const body = await getSmartNudge(user_id, domain, today);
    if (!body) continue; // skip if no nudge needed (e.g. already hit goal)

    try {
      await webpush.sendNotification(
        subData.subscription,
        JSON.stringify({ title: `LifeOS · ${domain.charAt(0).toUpperCase() + domain.slice(1)}`, body, url: DOMAIN_URLS[domain] || "/" })
      );
      await supabase.from("notification_log").insert({
        id: Math.random().toString(36).slice(2),
        user_id, domain, date: today, time_slot: timeSlot, sent_at: now.toISOString(),
      });
      sent++;
    } catch (e: any) {
      console.error(`Push failed for ${user_id}:`, e.message);
    }
  }

  return NextResponse.json({ sent, time: currentTime });
}
