export type Domain =
  | "nutrition_add"
  | "nutrition_edit"
  | "hydration_add"
  | "sleep_log"
  | "steps_update"
  | "workout_complete"
  | "finance_expense"
  | "finance_goal_create"
  | "finance_goal_add"
  | "task_create"
  | "task_complete"
  | "unknown";

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Vitamins {
  vitA?: number;
  vitC?: number;
  vitD?: number;
  vitB12?: number;
  iron?: number;
  magnesium?: number;
  calcium?: number;
}

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack" | "supplement" | "uncategorized";

export interface NutritionEntry {
  id: string;
  date: string;
  timestamp: number;
  food: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  vitamins?: Vitamins;
  source: "voice" | "manual" | "quick" | "search";
  meal?: MealCategory;
}

export interface HydrationEntry {
  id: string;
  date: string;
  timestamp: number;
  amount: number;
}

export interface SleepEntry {
  id: string;
  date: string;
  timestamp: number;
  duration: number;
  quality: number;
  bedtime?: string;
  wakeTime?: string;
}

export interface StepEntry {
  id: string;
  date: string;
  count: number;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  timestamp: number;
  type: string;
  duration: number;
  intensity: number;
  exercises: WorkoutExercise[];
  notes?: string;
  completed: boolean;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  timestamp: number;
  amount: number;
  category: string;
  description: string;
  type: "expense" | "income";
}

export interface FinanceGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  currency: string;
  createdAt: number;
}

export interface RecurringTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3;
  createdAt: number;
}

export interface Task {
  id: string;
  date: string;
  title: string;
  completed: boolean;
  priority: 1 | 2 | 3;
  createdAt: number;
}

export interface MomentumBreakdown {
  nutrition: number;
  workout: number;
  sleep: number;
  tasks: number;
  finance: number;
  steps: number;
}

export interface MomentumSnapshot {
  id: string;
  date: string;
  score: number;
  breakdown: MomentumBreakdown;
  computedAt: number;
}

export interface UserSettings {
  id: "settings";
  name: string;
  macroTargets: MacroTargets;
  hydrationGoal: number;
  stepGoal: number;
  sleepGoal: number;
  momentumWeights: MomentumBreakdown;
  monthlyTokenBudget: number;
  tokensUsed: number;
  tokensResetDate: string;
  homeWidgets?: { streak: boolean; trendGraph: boolean; hydrationChart: boolean; sleepChart: boolean };
  navConfig?: string[];
}

export interface ParsedIntent {
  domain: Domain;
  confidence: number;
  data: Record<string, unknown>;
  rawTranscript: string;
  requiresConfirmation: boolean;
}

export interface VoiceLogEntry {
  id: string;
  timestamp: number;
  rawTranscript: string;
  parsedIntent?: ParsedIntent;
  tokensUsed?: number;
  tier: 1 | 2 | 3 | 4;
  success: boolean;
}
