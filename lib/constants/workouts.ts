export const WORKOUT_TYPES = [
  "Push",
  "Pull",
  "Legs",
  "Upper",
  "Lower",
  "Full Body",
  "Cardio",
  "HIIT",
  "Run",
  "Cycle",
  "Swim",
  "Yoga",
  "Mobility",
  "Other",
] as const;

export const COMMON_EXERCISES: Record<string, string[]> = {
  Push: ["Bench Press", "Overhead Press", "Incline Press", "Dips", "Lateral Raises", "Tricep Pushdown"],
  Pull: ["Deadlift", "Pull Ups", "Barbell Row", "Cable Row", "Face Pulls", "Bicep Curl"],
  Legs: ["Squat", "Romanian Deadlift", "Leg Press", "Lunges", "Leg Curl", "Calf Raises"],
  Upper: ["Bench Press", "Pull Ups", "Overhead Press", "Barbell Row", "Bicep Curl", "Tricep Pushdown"],
  Lower: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raises"],
  "Full Body": ["Squat", "Deadlift", "Bench Press", "Pull Ups", "Overhead Press"],
};
