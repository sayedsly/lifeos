"use client";
import { useState } from "react";
import { updateSettings, getSettings } from "@/lib/supabase/queries";

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("150");
  const [carbs, setCarbs] = useState("200");
  const [fat, setFat] = useState("70");
  const [hydration, setHydration] = useState("2500");
  const [sleep, setSleep] = useState("8");
  const [steps, setSteps] = useState("10000");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      const current = await getSettings();
      await updateSettings({
        ...current,
        name: name.trim() || "You",
        macroTargets: {
          calories: parseFloat(calories),
          protein: parseFloat(protein),
          carbs: parseFloat(carbs),
          fat: parseFloat(fat),
          fiber: current.macroTargets.fiber,
        },
        hydrationGoal: parseInt(hydration),
        sleepGoal: parseFloat(sleep),
        stepGoal: parseInt(steps),
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "#09090b", zIndex: 200,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "32px",
  };

  const card: React.CSSProperties = {
    width: "100%", maxWidth: "400px", display: "flex",
    flexDirection: "column", gap: "24px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#18181b", border: "1px solid #27272a",
    borderRadius: "14px", padding: "14px 16px", color: "white",
    fontSize: "16px", fontWeight: 600, outline: "none",
    boxSizing: "border-box",
  };

  const label = (text: string) => (
    <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "6px" }}>{text}</p>
  );

  const progressDots = (
    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: i === step ? "20px" : "6px", height: "6px", borderRadius: "999px", background: i === step ? "white" : "#27272a", transition: "all 300ms" }} />
      ))}
    </div>
  );

  const nextBtn = (onClick: () => void, label: string, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "16px", borderRadius: "16px",
      background: disabled ? "#27272a" : "white",
      color: disabled ? "#52525b" : "black",
      fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em",
      textTransform: "uppercase", border: "none", cursor: disabled ? "default" : "pointer",
    }}>{label}</button>
  );

  return (
    <div style={overlay}>
      <div style={card}>
        {/* Header */}
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>LifeOS</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "white" }}>
            {step === 1 ? "What's your name?" : step === 2 ? "Set your targets." : "Set your goals."}
          </p>
          <p style={{ fontSize: "13px", color: "#52525b", marginTop: "6px" }}>
            {step === 1 ? "You can change this anytime in settings." : step === 2 ? "These drive your daily nutrition score." : "These set your activity benchmarks."}
          </p>
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            {label("Display Name")}
            <input
              autoFocus
              placeholder="e.g. Sayed"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && setStep(2)}
              style={inputStyle}
            />
          </div>
        )}

        {/* Step 2 — Macros */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { l: "Calories (kcal)", v: calories, s: setCalories },
                { l: "Protein (g)", v: protein, s: setProtein },
                { l: "Carbs (g)", v: carbs, s: setCarbs },
                { l: "Fat (g)", v: fat, s: setFat },
              ].map(({ l, v, s }) => (
                <div key={l}>
                  {label(l)}
                  <input type="number" value={v} onChange={e => s(e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Goals */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { l: "Daily Water (ml)", v: hydration, s: setHydration },
              { l: "Sleep Goal (hours)", v: sleep, s: setSleep },
              { l: "Step Goal", v: steps, s: setSteps },
            ].map(({ l, v, s }) => (
              <div key={l}>
                {label(l)}
                <input type="number" value={v} onChange={e => s(e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        )}

        {progressDots}

        {step < 3
          ? nextBtn(() => setStep(step + 1), "Continue")
          : nextBtn(finish, saving ? "Saving..." : "Let's Go 🚀", saving)
        }

        {step > 1 && (
          <button onClick={() => setStep(step - 1)} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", textAlign: "center" }}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
