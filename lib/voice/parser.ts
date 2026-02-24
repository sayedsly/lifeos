import type { ParsedIntent, Domain } from "@/types";
import { FOOD_DB } from "@/lib/constants/foods";

function extractNumber(text: string): number | null {
  const map: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
  };
  const numMatch = text.match(/\d+(\.\d+)?/);
  if (numMatch) return parseFloat(numMatch[0]);
  for (const [word, val] of Object.entries(map)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return val;
  }
  return null;
}

function tryParseHydration(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(water|drink|drank|ml|liter|litre|glass|bottle|cup)/.test(t)) return null;
  let amount = 0;
  const mlMatch = t.match(/(\d+)\s*ml/);
  const literMatch = t.match(/(\d+(\.\d+)?)\s*(liter|litre|l\b)/);
  const glassMatch = t.match(/(\d+|a|an|one|two|three)?\s*glass/);
  const bottleMatch = t.match(/(\d+|a|an|one|two|three)?\s*bottle/);
  const cupMatch = t.match(/(\d+|a|an|one|two|three)?\s*cup/);
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
  if (!/(sleep|slept|bed|woke|hours? of sleep|hours? last night)/.test(t)) return null;
  const hours = extractNumber(t);
  if (!hours) return null;
  return { domain: "sleep_log", confidence: 0.85, data: { duration: hours, quality: 3 }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseSteps(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(step|steps|walked|walk)/.test(t)) return null;
  const count = extractNumber(t);
  if (!count) return null;
  return { domain: "steps_update", confidence: 0.9, data: { count }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseTask(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(add task|remind me|task:|todo:|to do|need to|have to)/.test(t)) return null;
  const title = text.replace(/add task[:\s]*/i, "").replace(/remind me to\s*/i, "").trim();
  if (!title) return null;
  return { domain: "task_create", confidence: 0.85, data: { title, priority: 2 }, rawTranscript: text, requiresConfirmation: false };
}

function tryParseFinance(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  const goalAddMatch = t.match(/add\s+\$?(\d+(?:\.\d+)?)\s+to\s+(.+)/);
  if (goalAddMatch) {
    return {
      domain: "finance_goal_add",
      confidence: 0.9,
      data: { amount: parseFloat(goalAddMatch[1]), goalName: goalAddMatch[2].trim() },
      rawTranscript: text,
      requiresConfirmation: true,
    };
  }
  const expenseMatch = t.match(/(?:spent|spend|paid|pay)\s+\$?(\d+(?:\.\d+)?)\s+(?:on\s+)?(.+)/);
  if (expenseMatch) {
    return {
      domain: "finance_expense",
      confidence: 0.9,
      data: { amount: parseFloat(expenseMatch[1]), description: expenseMatch[2].trim(), category: "Other" },
      rawTranscript: text,
      requiresConfirmation: true,
    };
  }
  return null;
}

function tryParseNutrition(text: string): ParsedIntent | null {
  const t = text.toLowerCase();
  if (!/(ate|eat|had|have|eating|consumed|drank|drink|breakfast|lunch|dinner|snack)/.test(t) &&
    !FOOD_DB.some(f => t.includes(f.name))) return null;
  const matched: Array<{ food: typeof FOOD_DB[0]; quantity: number }> = [];
  for (const food of FOOD_DB) {
    if (t.includes(food.name)) {
      const beforeFood = t.slice(0, t.indexOf(food.name));
      const quantity = extractNumber(beforeFood) || 1;
      matched.push({ food, quantity });
    }
  }
  if (matched.length === 0) return null;
  const totals = matched.reduce(
    (acc, { food, quantity }) => ({
      calories: acc.calories + food.calories * quantity,
      protein: acc.protein + food.protein * quantity,
      carbs: acc.carbs + food.carbs * quantity,
      fat: acc.fat + food.fat * quantity,
      fiber: acc.fiber + food.fiber * quantity,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
  const foodLabel = matched.map(m => `${m.quantity > 1 ? m.quantity + "x " : ""}${m.food.name}`).join(", ");
  return {
    domain: "nutrition_add",
    confidence: 0.85,
    data: { food: foodLabel, amount: matched.map(m => m.food.serving).join(", "), ...totals, source: "voice" },
    rawTranscript: text,
    requiresConfirmation: true,
  };
}

export function parseIntent(transcript: string): ParsedIntent {
  const result =
    tryParseHydration(transcript) ||
    tryParseSleep(transcript) ||
    tryParseSteps(transcript) ||
    tryParseTask(transcript) ||
    tryParseFinance(transcript) ||
    tryParseNutrition(transcript);

  if (result) return result;
  return { domain: "unknown", confidence: 0, data: {}, rawTranscript: transcript, requiresConfirmation: true };
}
