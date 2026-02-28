import type { ParsedIntent } from "@/types";
import { FOOD_DB } from "@/lib/constants/foods";

function extractNumber(text: string): number | null {
  const map: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
    dozen: 12, couple: 2, few: 3,
  };
  const numMatch = text.match(/\d+(\.\d+)?/);
  if (numMatch) return parseFloat(numMatch[0]);
  for (const [word, val] of Object.entries(map)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return val;
  }
  return null;
}

// Convert distance/activity to steps
function distanceToSteps(text: string): number | null {
  const t = text.toLowerCase();
  // miles
  const mileMatch = t.match(/(\d+(\.\d+)?)\s*(mile|miles|mi\b)/);
  if (mileMatch) return Math.round(parseFloat(mileMatch[1]) * 2000);
  if (/\ba mile\b/.test(t)) return 2000;
  if (/\bhalf a mile\b/.test(t)) return 1000;
  // km
  const kmMatch = t.match(/(\d+(\.\d+)?)\s*(km|kilometer|kilometre)/);
  if (kmMatch) return Math.round(parseFloat(kmMatch[1]) * 1300);
  // 5k, 10k races
  const raceMatch = t.match(/(\d+)\s*k\b/);
  if (raceMatch) return Math.round(parseInt(raceMatch[1]) * 1300);
  // minutes of walking/running
  const walkMinMatch = t.match(/(\d+)\s*min(?:ute)?s?\s*(walk|walking)/);
  if (walkMinMatch) return Math.round(parseInt(walkMinMatch[1]) * 100);
  const runMinMatch = t.match(/(\d+)\s*min(?:ute)?s?\s*(run|running|jog|jogging)/);
  if (runMinMatch) return Math.round(parseInt(runMinMatch[1]) * 150);
  // hours of walking
  const walkHrMatch = t.match(/(\d+(\.\d+)?)\s*hour[s]?\s*(walk|walking)/);
  if (walkHrMatch) return Math.round(parseFloat(walkHrMatch[1]) * 6000);
  return null;
}

// Fuzzy food match — handles "eggs", "egg", "coffee", "banana" etc
function fuzzyFoodMatch(text: string): typeof FOOD_DB {
  const t = text.toLowerCase();
  return FOOD_DB.filter(food => {
    const name = food.name.toLowerCase();
    // exact
    if (t.includes(name)) return true;
    // singular/plural
    if (t.includes(name + "s") || t.includes(name.replace(/s$/, ""))) return true;
    // partial match for longer names
    if (name.length > 4 && (t.includes(name.slice(0, -1)) || name.includes(t.split(" ").find(w => w.length > 3) || ""))) return true;
    return false;
  });
}

function tryParseHydration(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(water|drink|drank|ml|liter|litre|glass|bottle|cup|hydrat)/.test(t)) return null;
  let amount = 0;
  const mlMatch = t.match(/(\d+)\s*ml/);
  const literMatch = t.match(/(\d+(\.\d+)?)\s*(liter|litre|l\b)/);
  const glassMatch = t.match(/(\d+(\.\d+)?|a|an|one|two|three)?\s*glass/);
  const bottleMatch = t.match(/(\d+(\.\d+)?|a|an|one|two|three)?\s*bottle/);
  const cupMatch = t.match(/(\d+(\.\d+)?|a|an|one|two|three)?\s*cup/);
  if (mlMatch) amount = parseInt(mlMatch[1]);
  else if (literMatch) amount = parseFloat(literMatch[1]) * 1000;
  else if (glassMatch) amount = (extractNumber(glassMatch[0]) || 1) * 250;
  else if (bottleMatch) amount = (extractNumber(bottleMatch[0]) || 1) * 500;
  else if (cupMatch) amount = (extractNumber(cupMatch[0]) || 1) * 240;
  else amount = 250;
  return { domain: "hydration_add", confidence: 0.9, data: { amount }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseSleep(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(sleep|slept|bed|woke|hours? of sleep|hours? last night|nap)/.test(t)) return null;
  let hours = extractNumber(t);
  if (!hours) return null;
  // "slept at 11 woke at 7" type parsing
  const qualityMatch = t.match(/quality\s+(\d)/);
  const quality = qualityMatch ? parseInt(qualityMatch[1]) : 3;
  return { domain: "sleep_log", confidence: 0.85, data: { duration: hours, quality }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseSteps(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  const isActivity = /(step|steps|walked|walk|run|ran|jog|jogged|hike|hiked|mile|km|kilometer)/.test(t);
  if (!isActivity) return null;

  // Direct step count
  const stepMatch = t.match(/(\d[\d,]*)\s*steps?/);
  if (stepMatch) {
    const count = parseInt(stepMatch[1].replace(",", ""));
    return { domain: "steps_update", confidence: 0.95, data: { count, activity: "steps" }, rawTranscript: text, requiresConfirmation: false };
  }

  // Convert distance/time to steps
  const stepsFromDistance = distanceToSteps(t);
  if (stepsFromDistance) {
    const activity = /run|ran|jog/.test(t) ? "run" : /hike/.test(t) ? "hike" : "walk";
    return { domain: "steps_update", confidence: 0.85, data: { count: stepsFromDistance, activity }, rawTranscript: text, requiresConfirmation: true };
  }

  // Generic "went for a walk/run" with no distance
  if (/(went for a walk|went for a run|went jogging|went hiking)/.test(t)) {
    const activity = /run|jog/.test(t) ? "run" : "walk";
    const defaultSteps = activity === "run" ? 5000 : 3000;
    return { domain: "steps_update", confidence: 0.7, data: { count: defaultSteps, activity }, rawTranscript: text, requiresConfirmation: true };
  }

  return null;
}

function tryParseTask(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(add task|remind me|task:|todo:|to do|need to|have to|don't forget|remember to)/.test(t)) return null;
  let title = text
    .replace(/add task[:\s]*/i, "")
    .replace(/remind me to\s*/i, "")
    .replace(/need to\s*/i, "")
    .replace(/have to\s*/i, "")
    .replace(/don't forget to\s*/i, "")
    .replace(/remember to\s*/i, "")
    .trim();
  if (!title) return null;
  const priorityMatch = t.match(/priority\s+(\d)/);
  const priority = priorityMatch ? parseInt(priorityMatch[1]) as 1 | 2 | 3 : 2;
  return { domain: "task_create", confidence: 0.85, data: { title, priority }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseFinance(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  const goalAddMatch = t.match(/add\s+\$?(\d+(?:\.\d+)?)\s+to\s+(.+)/);
  if (goalAddMatch) {
    return { domain: "finance_goal_add", confidence: 0.9, data: { amount: parseFloat(goalAddMatch[1]), goalName: goalAddMatch[2].trim() }, rawTranscript: text, requiresConfirmation: true };
  }
  const expenseMatch = t.match(/(?:spent|spend|paid|pay|bought|cost)\s+\$?(\d+(?:\.\d+)?)\s*(?:on\s+|for\s+)?(.+)?/);
  if (expenseMatch) {
    return { domain: "finance_expense", confidence: 0.9, data: { amount: parseFloat(expenseMatch[1]), description: (expenseMatch[2] || "expense").trim(), category: "Other" }, rawTranscript: text, requiresConfirmation: true };
  }
  return null;
}

function tryParseNutrition(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  const isFood = /(ate|eat|had|have|eating|consumed|breakfast|lunch|dinner|snack|meal|food)/.test(t);
  const matched = fuzzyFoodMatch(t);

  if (!isFood && matched.length === 0) return null;
  if (matched.length === 0) return null;

  const items = matched.map(food => {
    const beforeFood = t.slice(0, Math.max(0, t.search(new RegExp(food.name.slice(0, 4), "i"))));
    const quantity = extractNumber(beforeFood) || 1;
    return { food, quantity };
  });

  const totals = items.reduce(
    (acc, { food, quantity }) => ({
      calories: acc.calories + Math.round(food.calories * quantity),
      protein: Math.round((acc.protein + food.protein * quantity) * 10) / 10,
      carbs: Math.round((acc.carbs + food.carbs * quantity) * 10) / 10,
      fat: Math.round((acc.fat + food.fat * quantity) * 10) / 10,
      fiber: Math.round((acc.fiber + (food.fiber || 0) * quantity) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const foodLabel = items.map(m => `${m.quantity > 1 ? m.quantity + "x " : ""}${m.food.name}`).join(", ");
  const mealTime = /(breakfast|morning)/.test(t) ? "breakfast" : /(lunch|noon|midday)/.test(t) ? "lunch" : /(dinner|evening|night)/.test(t) ? "dinner" : "snack";

  return {
    domain: "nutrition_add",
    confidence: 0.85,
    data: { food: foodLabel, amount: items.map(m => m.food.serving).join(", "), meal: mealTime, ...totals, source: "voice" },
    rawTranscript: text,
    requiresConfirmation: true,
  };
}

export function parseIntent(transcript: string): ParsedIntent | null {
  return (
    tryParseHydration(transcript) ||
    tryParseSleep(transcript) ||
    tryParseSteps(transcript) ||
    tryParseTask(transcript) ||
    tryParseFinance(transcript) ||
    tryParseNutrition(transcript) ||
    null
  );
}
