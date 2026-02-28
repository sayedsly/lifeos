"use client";
import { useState } from "react";
import { getSettings, updateSettings } from "@/lib/supabase/queries";

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to LifeOS",
    subtitle: "Your personal life optimization system. Let's get you set up in 3 quick steps.",
    field: null,
  },
  {
    emoji: "🎯",
    title: "What's your daily calorie goal?",
    subtitle: "This helps track your nutrition score. You can change it anytime in Settings.",
    field: "calories",
    placeholder: "e.g. 2000",
    unit: "kcal",
    default: "2000",
  },
  {
    emoji: "💪",
    title: "Daily protein target?",
    subtitle: "Protein is key for muscle and recovery. Most people aim for 0.7–1g per lb of bodyweight.",
    field: "protein",
    placeholder: "e.g. 150",
    unit: "grams",
    default: "150",
  },
  {
    emoji: "👟",
    title: "Daily step goal?",
    subtitle: "10,000 steps is a popular target, but even 7,500 has big health benefits.",
    field: "steps",
    placeholder: "e.g. 10000",
    unit: "steps",
    default: "10000",
  },
  {
    emoji: "🚀",
    title: "You're all set!",
    subtitle: "Your Momentum Score tracks everything — nutrition, sleep, steps, workouts, tasks, and finance. Log something today to get started.",
    field: null,
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ calories: "2000", protein: "150", steps: "10000" });
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        macroTargets: {
          ...settings.macroTargets,
          calories: parseInt(values.calories) || 2000,
          protein: parseInt(values.protein) || 150,
        },
        stepGoal: parseInt(values.steps) || 10000,
      });
      setSaving(false);
      onComplete();
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#09090b", zIndex: 200,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? "24px" : "6px", height: "6px", borderRadius: "999px", background: i <= step ? "white" : "#27272a", transition: "all 300ms ease" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "56px" }}>{current.emoji}</p>
          <p style={{ fontSize: "22px", fontWeight: 700, color: "white", lineHeight: "1.3" }}>{current.title}</p>
          <p style={{ fontSize: "14px", color: "#71717a", lineHeight: "1.6" }}>{current.subtitle}</p>
        </div>

        {/* Input */}
        {current.field && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                type="number"
                value={values[current.field as keyof typeof values]}
                onChange={e => setValues(v => ({ ...v, [current.field!]: e.target.value }))}
                placeholder={current.placeholder}
                style={{
                  flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "16px",
                  padding: "18px 20px", color: "white", fontSize: "20px", fontWeight: 700,
                  outline: "none", textAlign: "center",
                }}
              />
              <p style={{ color: "#52525b", fontSize: "13px", flexShrink: 0 }}>{current.unit}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={handleNext} disabled={saving}
            style={{ width: "100%", padding: "18px", borderRadius: "18px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            {saving ? "Saving..." : isLast ? "Start Tracking →" : "Next →"}
          </button>
          {!isFirst && !isLast && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ← Back
            </button>
          )}
          {!isLast && (
            <button onClick={onComplete}
              style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "11px", cursor: "pointer", letterSpacing: "0.08em" }}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
