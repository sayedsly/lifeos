import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

const DAILY_LIMIT = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, message, history, imageBase64, imageMimeType } = await req.json();
    if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

    // Rate limiting
    const { data: usageRow } = await userSupabase.from("ai_usage").select("*").eq("user_id", userId).eq("date", today).single();
    const currentCount = usageRow?.count || 0;
    if (currentCount >= DAILY_LIMIT) return NextResponse.json({ error: "Cmon bro, chill — hit up Sayed to reset" }, { status: 429 });
    if (usageRow) await userSupabase.from("ai_usage").update({ count: currentCount + 1, last_query: message }).eq("id", usageRow.id);
    else await userSupabase.from("ai_usage").insert({ id: Math.random().toString(36).slice(2), user_id: userId, date: today, count: 1, last_query: message, cost_cents: 0 });

    // Fetch all user data
    const [
      { data: momentum }, { data: nutrition }, { data: sleep },
      { data: hydration }, { data: steps }, { data: workouts },
      { data: tasks }, { data: settingsRow }, { data: financeGoals },
      { data: transactions }, { data: bodyWeight }, { data: recurringTasks },
      { data: aiMemoryRow },
    ] = await Promise.all([
      userSupabase.from("momentum_snapshots").select("date,score,breakdown").eq("user_id", userId).gte("date", weekAgo).order("date"),
      userSupabase.from("nutrition_entries").select("date,calories,protein,carbs,fat,fiber,food,meal").eq("user_id", userId).gte("date", weekAgo).order("timestamp", { ascending: false }),
      userSupabase.from("sleep_entries").select("date,duration,quality").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("hydration_entries").select("date,amount").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("step_entries").select("date,count").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("workout_sessions").select("date,type,duration,intensity,exercises").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("tasks").select("date,title,completed,priority").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("user_settings").select("*").eq("user_id", userId).single(),
      userSupabase.from("finance_goals").select("*").eq("user_id", userId),
      userSupabase.from("finance_transactions").select("*").eq("user_id", userId).gte("date", weekAgo),
      userSupabase.from("body_weight_entries").select("date,weight,unit").eq("user_id", userId).order("timestamp", { ascending: false }).limit(10),
      userSupabase.from("recurring_tasks").select("*").eq("user_id", userId),
      userSupabase.from("ai_memory").select("facts").eq("user_id", userId).single(),
    ]);

    // Fetch achievements, challenges, friends separately to avoid complex query
    const { data: achievements } = await userSupabase.from("achievements").select("type,title,earned_at").eq("user_id", userId);
    const { data: friendships } = await userSupabase.from("friendships").select("requester_id,addressee_id").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status","accepted");
    const friendIds = (friendships || []).map((f: any) => f.requester_id === userId ? f.addressee_id : f.requester_id);
    let friendProfiles: any[] = [];
    if (friendIds.length > 0) {
      const { data: fp } = await userSupabase.from("profiles").select("id,username").in("id", friendIds);
      friendProfiles = fp || [];
    }
    const { data: activeChallenges } = await userSupabase.from("challenge_participants").select("challenge_id").eq("user_id", userId);
    const challengeIds = (activeChallenges || []).map((c: any) => c.challenge_id);
    let challenges: any[] = [];
    if (challengeIds.length > 0) {
      const { data: ch } = await userSupabase.from("challenges").select("*").in("id", challengeIds);
      challenges = ch || [];
    }

    const s = settingsRow || {};
    const userGoals = {
      calories: s.macro_targets?.calories || 2000,
      protein: s.macro_targets?.protein || 150,
      carbs: s.macro_targets?.carbs || 250,
      fat: s.macro_targets?.fat || 65,
      hydration: s.hydration_goal || 2500,
      sleep: s.sleep_goal || 8,
      steps: s.step_goal || 10000,
    };

    const todayNutrition = (nutrition || []).filter((n: any) => n.date === today);
    const totalCals = todayNutrition.reduce((s: number, n: any) => s + (n.calories || 0), 0);
    const totalProtein = todayNutrition.reduce((s: number, n: any) => s + (n.protein || 0), 0);
    const todayHydration = (hydration || []).filter((h: any) => h.date === today).reduce((s: number, h: any) => s + (h.amount || 0), 0);
    const todaySteps = (steps || []).find((s: any) => s.date === today)?.count || 0;
    const todayTasks = (tasks || []).filter((t: any) => t.date === today);
    const latestWeight = bodyWeight?.[0];

    console.log("[Memory read]", JSON.stringify(aiMemoryRow));
    const memoryFacts: string[] = aiMemoryRow?.facts || [];
    const dataContext = `
TODAY (${today}):
- Calories: ${totalCals}/${userGoals.calories} kcal | Protein: ${totalProtein}g/${userGoals.protein}g
- Hydration: ${todayHydration}ml/${userGoals.hydration}ml
- Steps: ${todaySteps}/${userGoals.steps}
- Tasks today: ${todayTasks.map((t: any) => `${t.title}(${t.completed ? "done" : "pending"})`).join(", ") || "none"}
- Meals logged: ${todayNutrition.map((n: any) => `${n.food}(${n.calories}cal,${n.meal})`).join(", ") || "none"}

THIS WEEK:
- Workouts: ${(workouts || []).length} sessions — ${(workouts || []).map((w: any) => `${w.date}:${w.type}(${w.duration}min)`).join(", ") || "none"}
- Sleep: ${(sleep || []).map((s: any) => `${s.date}:${s.duration}h`).join(", ") || "none"}
- Momentum scores: ${(momentum || []).map((m: any) => `${m.date}:${m.score}`).join(", ") || "none"}

FINANCE:
- Goals: ${(financeGoals || []).map((g: any) => `${g.name}($${g.current_amount}/$${g.target_amount})`).join(", ") || "none"}
- Recent transactions: ${(transactions || []).slice(0, 10).map((t: any) => `${t.date}:${t.type}$${t.amount}(${t.category})`).join(", ") || "none"}

BODY & SETTINGS:
- Latest weight: ${latestWeight ? `${latestWeight.weight}${latestWeight.unit} on ${latestWeight.date}` : "not logged"}
- Goals: ${JSON.stringify(userGoals)}
- Recurring tasks: ${(recurringTasks || []).map((t: any) => t.title).join(", ") || "none"}
${memoryFacts.length > 0 ? "\nMY PERSISTENT MEMORY ABOUT YOU:\n" + memoryFacts.map((f: string) => `- ${f}`).join("\n") : ""}

FRIENDS (${friendProfiles.length}): ${friendProfiles.map((f: any) => `${f.username}(id:${f.id})`).join(", ") || "none"}

ACHIEVEMENTS EARNED (${(achievements||[]).length}/${14}): ${(achievements||[]).map((a: any) => a.title).join(", ") || "none"}
ACHIEVEMENTS NOT YET EARNED: ${["First Rep","Tracked","Weighed In","3-Day Streak","Week Warrior","Unstoppable","Protein King","Hydration Hero","Step Master","Iron Regular","Diamond","Perfect Day","Sleep King","Money Moves"].filter(t => !(achievements||[]).find((a: any) => a.title === t)).join(", ")}

ACTIVE CHALLENGES: ${challenges.map((c: any) => `${c.title}(${c.type},goal:${c.goal},ends:${c.end_date})`).join(", ") || "none"}
`;

    const historyContext = history && history.length > 0
      ? "\n\nCONVERSATION HISTORY (same session — continue this thread):\n" + history.slice(-8).map((m: any) => `${m.role === "user" ? "User" : "You"}: ${m.text}`).join("\n")
      : "";

    const systemPrompt = `You are the LifeOS AI — a personal optimization coach with FULL ability to read and modify every module in the app.

You can perform ANY of these actions by returning them in ACTIONS array:
- nutrition_log: {"entries":[{"food":"chicken","calories":300,"protein":30,"carbs":5,"fat":8,"meal":"lunch"}]}
- nutrition_delete: {"food":"pizza"}
- macro_targets_update: {"calories":2200,"protein":160,"carbs":240,"fat":70}
- hydration_log: {"entries":[{"amount":500}]}
- sleep_log: {"duration":7.5,"quality":4,"bedtime":"23:00","wakeTime":"06:30"}
- steps_log: {"steps":8000}
- task_add: {"tasks":[{"title":"Buy groceries","priority":2}]}
- task_complete: {"titles":["Buy groceries"]}
- task_delete: {"titles":["Old task"]}
- recurring_task_add: {"tasks":[{"title":"Morning walk","frequency":"daily","priority":2}]}
- recurring_task_delete: {"title":"Morning walk"}
- workout_session_log: {"type":"Push","duration":54,"intensity":4,"exercises":[{"name":"Bench Press","sets":4,"reps":8,"weight":135}]}
- workout_plan_save: {"name":"My Push Day","type":"Push","exercises":[]}
- workout_plan_delete: {"name":"Old Plan"}
- finance_transaction_log: {"transactions":[{"amount":50,"type":"expense","category":"food","note":"lunch"}]}
- finance_transaction_delete: {"note":"lunch"}
- finance_goal_add: {"goals":[{"name":"Japan Trip","targetAmount":5000}]} — ALWAYS estimate a realistic targetAmount based on the goal name (Japan trip=5000, car=20000, emergency fund=10000, mortgage downpayment=50000, vacation=3000, etc). Never use 0 or 1000 as default unless truly unknown.
- finance_goal_update: {"goals":[{"name":"Japan","addAmount":500}]} or {"goals":[{"name":"Japan","subtractAmount":200}]} or {"goals":[{"name":"Japan","setAmount":1000}]}
- finance_goal_delete: {"goals":[{"name":"Japan"}]}
- finance_split: {"splits":[{"goalName":"Japan","amount":333},{"goalName":"Mortgage","amount":333}]}
- body_weight_log: {"weight":165,"unit":"lbs"}
- settings_update: {"step_goal":12000} or {"sleep_goal":8} or {"hydration_goal":3000}
- challenge_create: {"title":"Step Battle","type":"steps","goal":10000,"days":7,"inviteAll":true} or {"title":"Step Battle","type":"steps","goal":10000,"days":7,"inviteFriendIds":["id1","id2"]}
- achievement_check: {} — triggers achievement check and reports what user has/hasn't earned
- mood_log: {"mood":4,"note":"Feeling great"} — mood 1-5
- body_weight_log: {"weight":175,"unit":"lbs"}

RULES:
- ALWAYS return complete responses, never cut off mid-sentence
- For multi-step requests, return ALL actions needed in the actions array
- If request is ambiguous, make your best assumption and state it
- Never ask for follow-up info — if you need more, say "Try again with: [exact example]"
- If your response ends with a question for clarification, set needsFollowUp: true
- Keep responses under 180 words, warm and direct
- Use the user's actual data numbers in responses
- When user asks about achievements, list what they have and what they're close to earning based on their data
- When user says "invite all my friends" to a challenge, use inviteAll:true
- When user mentions specific friends by username, look them up in the FRIENDS list and use their ids in inviteFriendIds
- For food photo analysis requests, acknowledge you can analyze food images when user uploads one via the attachment button

MEMORY RULE (MANDATORY): Any time the user mentions a personal preference, habit, hobby, schedule, goal, or fact about themselves — you MUST output a MEMORY line. This is non-negotiable.
Examples: "I like Pokemon" → MEMORY:["User's hobby is Pokemon"]
"I wake up at 6am" → MEMORY:["User wakes up at 6am"]
"I'm cutting" → MEMORY:["User is in a calorie deficit / cutting phase"]
Say "Got it, I'll remember that! 🧠" when storing a memory.

Return format (STRICT — always include all three lines):
ACTIONS:[{"type":"action_type","data":{...}},{"type":"action_type2","data":{...}}]
FOLLOWUP:true or FOLLOWUP:false`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [
            ...(imageBase64 ? [{ inline_data: { mime_type: imageMimeType || "image/jpeg", data: imageBase64 } }] : []),
            { text: systemPrompt + "\n\n" + dataContext + historyContext + "\n\nUser says: " + message + (imageBase64 ? "\n[User attached a food photo — analyze it and estimate macros, return nutrition_log action]" : "") }
          ] }],
          generationConfig: { maxOutputTokens: 2500, temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[Agent raw]", raw.slice(0, 500));

    // Parse ACTIONS and FOLLOWUP from response
    let actions: any[] = [];
    let needsFollowUp = false;
    let text = raw;

    const followupMatch = raw.match(/FOLLOWUP:\s*(true|false)/i);
    if (followupMatch) needsFollowUp = followupMatch[1].toLowerCase() === "true";

    console.log("[Full raw]", raw);
    // Strip ACTIONS block
    const actionsIdx = raw.indexOf("ACTIONS:");
    if (actionsIdx >= 0) {
      const afterActions = raw.slice(actionsIdx + 8).trim();
      // Find the closing ] of the JSON array robustly
      let depth = 0, endIdx = -1;
      for (let i = 0; i < afterActions.length; i++) {
        if (afterActions[i] === "[") depth++;
        else if (afterActions[i] === "]") { depth--; if (depth === 0) { endIdx = i; break; } }
      }
      const actionsStr = endIdx >= 0 ? afterActions.slice(0, endIdx + 1) : afterActions.split(/\nFOLLOWUP:/)[0].trim();
      try {
        const parsed = JSON.parse(actionsStr);
        actions = Array.isArray(parsed) ? parsed.filter((a: any) => a.type !== "none") : [];
      } catch (e) { console.error("Actions parse error:", e, "\nStr was:", actionsStr.slice(0, 300)); }
      // Text is everything before ACTIONS plus everything after the closing ]
      const beforeActions = raw.slice(0, actionsIdx).trim();
      const afterJson = endIdx >= 0 ? afterActions.slice(endIdx + 1).trim() : "";
      text = (beforeActions + " " + afterJson).trim();
    }

    // Strip FOLLOWUP line from text regardless
    text = text.replace(/FOLLOWUP:\s*(true|false)/gi, "").trim();
    // Strip MEMORY line from text
    text = text.replace(/MEMORY:\s*\[[\s\S]*?\]/, "").trim();

    if (!text) text = "Got it! Here's what I'll do:";

    // Parse MEMORY facts
    let newFacts: string[] = [];
    const memoryMatch = raw.match(/MEMORY:\s*(\[[\s\S]*?\])/);
    if (memoryMatch) {
      try { newFacts = JSON.parse(memoryMatch[1]); } catch (e) {}
      text = text.replace(/MEMORY:\s*\[[\s\S]*?\]/, "").trim();
    }

    // Upsert ai_memory if new facts found — use service role to bypass RLS
    if (newFacts.length > 0) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const merged = Array.from(new Set(memoryFacts.concat(newFacts))).slice(0, 50);
      await serviceSupabase.from("ai_memory").delete().eq("user_id", userId);
      const { error: memErr } = await serviceSupabase.from("ai_memory").insert({
        id: Math.random().toString(36).slice(2),
        user_id: userId,
        facts: merged,
        last_updated: new Date().toISOString(),
      });
      console.log("[Memory write]", merged, memErr);
    }

    const estimatedCostCents = Math.round((500 * 0.075 + 300 * 0.30) / 1000 * 100) / 100;
    await userSupabase.from("ai_usage").update({ cost_cents: ((usageRow?.cost_cents || 0) + estimatedCostCents) }).eq("user_id", userId).eq("date", today);

    return NextResponse.json({ text, actions, needsFollowUp, remainingCalls: DAILY_LIMIT - currentCount - 1 });
  } catch (e: any) {
    console.error("Agent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}