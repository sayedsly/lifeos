"use client";
import { useState } from "react";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to LifeOS",
    subtitle: "Your personal life optimization system. Let's get you set up in a few quick steps.",
    field: null,
    type: "intro",
  },
  {
    emoji: "😊",
    title: "What's your name?",
    subtitle: "We'll use this to personalize your experience.",
    field: "name",
    placeholder: "e.g. Sayed",
    unit: "",
    default: "",
    inputType: "text",
    type: "input",
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
    type: "input",
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
    type: "input",
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
    type: "input",
  },
  {
    emoji: "📱",
    title: "Add LifeOS to your Home Screen",
    subtitle: "Get the full app experience — works offline, launches instantly, no browser bar.",
    field: null,
    type: "pwa",
  },
  {
    emoji: "🚀",
    title: "You're all set!",
    subtitle: "Your Momentum Score tracks everything — nutrition, sleep, steps, workouts, tasks, and finance. We've added some demo data so you can explore.",
    field: null,
    type: "done",
  },
];

async function seedDemoData(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");

  // Nutrition entries
  await supabase.from("nutrition_entries").insert([
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, food: "Chicken & Rice", calories: 520, protein: 42, carbs: 55, fat: 8, meal: "lunch" },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, food: "Greek Yogurt", calories: 150, protein: 15, carbs: 12, fat: 3, meal: "breakfast" },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: yesterday, food: "Salmon & Veggies", calories: 480, protein: 38, carbs: 20, fat: 18, meal: "dinner" },
  ]);

  // Sleep
  await supabase.from("sleep_entries").insert([
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, duration: 7.5, quality: 4, bedtime: "23:00", wake_time: "06:30" },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: yesterday, duration: 6.5, quality: 3, bedtime: "00:00", wake_time: "06:30" },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: twoDaysAgo, duration: 8, quality: 5, bedtime: "22:30", wake_time: "06:30" },
  ]);

  // Steps
  await supabase.from("step_entries").insert([
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, count: 6800 },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: yesterday, count: 11200 },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: twoDaysAgo, count: 9400 },
  ]);

  // Hydration
  await supabase.from("hydration_entries").insert([
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, amount: 1200 },
    { id: Math.random().toString(36).slice(2), user_id: userId, date: yesterday, amount: 2400 },
  ]);

  // Body weight
  await supabase.from("body_weight_entries").insert([
    { id: Math.random().toString(36).slice(2), user_id: userId, date: today, weight: 175, unit: "lbs", note: "Morning" },
  ]);
}

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
        macroTargets: { ...settings.macroTargets, calories: parseInt(values.calories) || 2000, protein: parseInt(values.protein) || 150 },
        stepGoal: parseInt(values.steps) || 10000,
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await seedDemoData(session.user.id).catch(() => {});
      }
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

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 24px" }}>
      <div style={{ width: "100%", maxWidth: 448, background: "white", borderRadius: "32px 32px 28px 28px", padding: "32px 28px 20px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "28px" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: "999px", background: i === step ? "#111118" : i < step ? "#22c55e" : "#e5e7eb", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }} />
          ))}
        </div>

        <p style={{ fontSize: "48px", textAlign: "center", marginBottom: "16px" }}>{current.emoji}</p>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#111118", textAlign: "center", letterSpacing: "-0.5px", marginBottom: "8px" }}>{current.title}</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>{current.subtitle}</p>

        {current.type === "pwa" && (
          <div style={{ background: "#f7f8fc", borderRadius: "20px", padding: "16px", marginBottom: "16px" }}>
            {isIOS ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { step: "1", text: "Tap the Share button", detail: "The box with an arrow at the bottom of Safari", emoji: "⬆️" },
                  { step: "2", text: "Scroll down and tap", detail: "Add to Home Screen", emoji: "📲" },
                  { step: "3", text: "Tap Add", detail: "LifeOS will appear on your Home Screen like a native app", emoji: "✅" },
                ].map(({ step: s, text, detail, emoji }) => (
                  <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "8px", background: "#111118", color: "white", fontSize: "12px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s}</div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{emoji} {text}</p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { emoji: "🌐", text: "Chrome", detail: "Tap menu → Add to Home screen" },
                  { emoji: "🧭", text: "Safari (iPad)", detail: "Tap Share → Add to Home Screen" },
                ].map(({ emoji, text, detail }) => (
                  <div key={text} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "20px" }}>{emoji}</span>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#111118" }}>{text}</p>
                      <p style={{ fontSize: "11px", color: "#9ca3af" }}>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {current.type === "input" && current.field && (
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
            <button onClick={() => setStep(s => s - 1)} style={{ padding: "14px 20px", background: "#f1f5f9", border: "none", borderRadius: "16px", fontSize: "14px", fontWeight: 700, color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
              Back
            </button>
          )}
          <button onClick={handleNext} disabled={saving || !canProceed()}
            style={{ flex: 1, padding: "16px", background: canProceed() ? "#111118" : "#e5e7eb", border: "none", borderRadius: "16px", fontSize: "15px", fontWeight: 800, color: canProceed() ? "white" : "#9ca3af", cursor: canProceed() ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s" }}>
            {saving ? "Setting up..." : isLast ? "Let's Go 🚀" : current.type === "pwa" ? "Got it →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
