"use client";
import { useState } from "react";
import { getSettings, updateSettings } from "@/lib/supabase/queries";

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to LifeOS",
    subtitle: "Your personal life optimization system. Let's get you set up in 4 quick steps.",
    field: null,
  },
  {
    emoji: "😊",
    title: "What\'s your name?",
    subtitle: "We\'ll use this to personalize your experience.",
    field: "name",
    placeholder: "e.g. Sayed",
    unit: "",
    default: "",
    inputType: "text",
  },
  {
    emoji: "🎯",
    title: "Daily calorie goal?",
    subtitle: "This helps track your nutrition score. You can change it anytime in Settings.",
    field: "calories",
    placeholder: "e.g. 2000",
    unit: "kcal",
    default: "2000",
    inputType: "number",
  },
  {
    emoji: "💪",
    title: "Daily protein target?",
    subtitle: "Most people aim for 0.7–1g per lb of bodyweight.",
    field: "protein",
    placeholder: "e.g. 150",
    unit: "grams",
    default: "150",
    inputType: "number",
  },
  {
    emoji: "👟",
    title: "Daily step goal?",
    subtitle: "10,000 steps is popular, but even 7,500 has big health benefits.",
    field: "steps",
    placeholder: "e.g. 10000",
    unit: "steps",
    default: "10000",
    inputType: "number",
  },
  {
    emoji: "🚀",
    title: "You\'re all set!",
    subtitle: "Your Momentum Score tracks everything — nutrition, sleep, steps, workouts, tasks, and finance. Log something today to get started.",
    field: null,
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: "", calories: "2000", protein: "150", steps: "10000" });
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
        name: values.name || "Friend",
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

  const canProceed = () => {
    if (!current.field) return true;
    if (current.field === "name") return values.name.trim().length >= 2;
    return true;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0 0 24px",
    }}>
      <div style={{
        width: "100%", maxWidth: 448,
        background: "white",
        borderRadius: "32px 32px 28px 28px",
        padding: "32px 28px 20px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "28px" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: "999px",
              background: i === step ? "#111118" : i < step ? "#22c55e" : "#e5e7eb",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
          ))}
        </div>

        <p style={{ fontSize: "48px", textAlign: "center", marginBottom: "16px" }}>{current.emoji}</p>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#111118", textAlign: "center", letterSpacing: "-0.5px", marginBottom: "8px" }}>{current.title}</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", fontWeight: 600, lineHeight: 1.5, marginBottom: "28px" }}>{current.subtitle}</p>

        {current.field && (
          <div style={{ display: "flex", alignItems: "center", background: "#f7f8fc", borderRadius: "16px", padding: "4px 16px 4px 4px", marginBottom: "20px", border: "1.5px solid #e5e7eb" }}>
            <input
              type={current.inputType || "text"}
              value={values[current.field as keyof typeof values]}
              onChange={e => setValues(v => ({ ...v, [current.field!]: e.target.value }))}
              placeholder={current.placeholder}
              autoFocus
              onKeyDown={e => e.key === "Enter" && canProceed() && handleNext()}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "20px", fontWeight: 800, color: "#111118", padding: "14px 12px", fontFamily: "inherit" }}
            />
            {current.unit && <span style={{ fontSize: "13px", fontWeight: 700, color: "#9ca3af" }}>{current.unit}</span>}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          {!isFirst && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: "14px 20px", background: "#f1f5f9", border: "none", borderRadius: "16px", fontSize: "14px", fontWeight: 700, color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
              Back
            </button>
          )}
          <button onClick={handleNext} disabled={saving || !canProceed()}
            style={{ flex: 1, padding: "16px", background: canProceed() ? "#111118" : "#e5e7eb", border: "none", borderRadius: "16px", fontSize: "15px", fontWeight: 800, color: canProceed() ? "white" : "#9ca3af", cursor: canProceed() ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s" }}>
            {saving ? "Saving..." : isLast ? "Get Started 🚀" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}