import Dexie, { type Table } from "dexie";
import type {
  NutritionEntry,
  HydrationEntry,
  SleepEntry,
  StepEntry,
  WorkoutSession,
  FinanceTransaction,
  FinanceGoal,
  Task,
  MomentumSnapshot,
  UserSettings,
  VoiceLogEntry,
} from "@/types";

export class LifeOSDatabase extends Dexie {
  nutrition!: Table<NutritionEntry>;
  hydration!: Table<HydrationEntry>;
  sleep!: Table<SleepEntry>;
  steps!: Table<StepEntry>;
  workouts!: Table<WorkoutSession>;
  transactions!: Table<FinanceTransaction>;
  goals!: Table<FinanceGoal>;
  tasks!: Table<Task>;
  momentum!: Table<MomentumSnapshot>;
  settings!: Table<UserSettings>;
  voiceLogs!: Table<VoiceLogEntry>;

  constructor() {
    super("lifeos");
    this.version(1).stores({
      nutrition:    "id, date, timestamp",
      hydration:    "id, date, timestamp",
      sleep:        "id, date",
      steps:        "id, date",
      workouts:     "id, date, timestamp",
      transactions: "id, date, timestamp, category",
      goals:        "id, name",
      tasks:        "id, date, priority, completed",
      momentum:     "id, date",
      settings:     "id",
      voiceLogs:    "id, timestamp",
    });
  }
}

export const db = new LifeOSDatabase();
