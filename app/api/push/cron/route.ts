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

const DOMAIN_MESSAGES: Record<string, string[]> = {
  nutrition: ["What did you eat? 🍽️ Log it before you forget", "Macro check! How's nutrition looking?", "Fuel logged = gains unlocked 💪"],
  hydration: ["Drink some water bro 💧 Your body is begging", "Hydration check! When did you last drink?", "You're probably dehydrated rn. Drink up 💦"],
  sleep: ["Bedtime soon 😴 Wind down and log your sleep", "Sleep is gains. Don't skip it 🌙", "Your future self thanks you for sleeping on time ⭐"],
  steps: ["You've been sitting too long 👟 Time to move!", "Step check — how are those legs doing?", "Get up and walk, you got this 🚶"],
  tasks: ["Your task list is waiting ✅ What are you tackling?", "Don't let your checklist collect dust 📋", "Tasks won't complete themselves... or will they? 👀"],
  workout: ["Time to hit it 💪 Your workout is waiting", "No excuses today. Let's get it 🏋️", "The gym called. It misses you 😅"],
  finance: ["Money check 💰 Did you spend anything today?", "Log your expenses before you forget", "Your future self wants to know where the money went 💸"],
  momentum: ["Here's your daily score ⚡ How'd you do today?", "Momentum recap time — let's see those numbers 📊", "Daily review is ready! Check your score"],
};

const DOMAIN_TITLES: Record<string, string> = {
  nutrition: "LifeOS · Nutrition", hydration: "LifeOS · Hydration",
  sleep: "LifeOS · Sleep", steps: "LifeOS · Steps",
  tasks: "LifeOS · Tasks", workout: "LifeOS · Workout",
  finance: "LifeOS · Finance", momentum: "LifeOS · Momentum",
};

const DOMAIN_URLS: Record<string, string> = {
  nutrition: "/nutrition", hydration: "/", sleep: "/",
  steps: "/", tasks: "/tasks", workout: "/workout",
  finance: "/finance", momentum: "/",
};

export async function GET(req: NextRequest) {
  // Vercel cron auth
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = format(now, "yyyy-MM-dd");

  // Get all notification prefs
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*");

  if (!prefs || prefs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const pref of prefs) {
    const { user_id, domain, enabled, times } = pref;
    if (!enabled || !times || times.length === 0) continue;

    // Check if any scheduled time matches current time (within 15 min window)
    const shouldSend = times.some((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const [ch, cm] = currentTime.split(":").map(Number);
      const diff = Math.abs((h * 60 + m) - (ch * 60 + cm));
      return diff <= 7; // within 7 mins of schedule
    });

    if (!shouldSend) continue;

    // Check not already sent today for this domain+time combo
    const { data: alreadySent } = await supabase
      .from("notification_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("domain", domain)
      .eq("date", today)
      .eq("time_slot", currentTime.slice(0, 4) + "0"); // round to 10min

    if (alreadySent && alreadySent.length > 0) continue;

    // Get subscription
    const { data: subData } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user_id)
      .single();

    if (!subData) continue;

    const msgs = DOMAIN_MESSAGES[domain] || ["Time to log!"];
    const body = msgs[Math.floor(Math.random() * msgs.length)];

    try {
      await webpush.sendNotification(
        subData.subscription,
        JSON.stringify({ title: DOMAIN_TITLES[domain] || "LifeOS", body, url: DOMAIN_URLS[domain] || "/" })
      );

      // Log it
      await supabase.from("notification_log").insert({
        id: Math.random().toString(36).slice(2),
        user_id, domain, date: today,
        time_slot: currentTime.slice(0, 4) + "0",
        sent_at: now.toISOString(),
      });

      sent++;
    } catch (e: any) {
      console.error(`Push failed for ${user_id}:`, e.message);
    }
  }

  return NextResponse.json({ sent, time: currentTime });
}