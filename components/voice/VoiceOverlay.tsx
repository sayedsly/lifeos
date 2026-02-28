"use client";
import { useState, useEffect } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useVoice } from "@/hooks/useVoice";
import { getVoiceExamples, saveVoiceExamples } from "@/lib/supabase/queries";

const DEFAULT_EXAMPLES = [
  "drank 2 glasses of water",
  "slept 7.5 hours",
  "walked a mile",
  "ran 5k",
  "ate eggs and toast",
  "add task buy groceries",
  "spent $15 on lunch",
  "logged push workout 45 minutes RPE 7",
];

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen } = useLifeStore();
  const { state, intent, error, speechSupported, start, stop, confirm, cancel, submitText, setIntent } = useVoice();
  const [textInput, setTextInput] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [customExamples, setCustomExamples] = useState<string[]>([]);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExample, setNewExample] = useState("");
  const [editedIntent, setEditedIntent] = useState<Record<string, any>>({});

  useEffect(() => {
    getVoiceExamples().then(ex => setCustomExamples(ex)).catch(() => {});
  }, []);

  useEffect(() => {
    if (intent?.data) setEditedIntent({ ...intent.data });
  }, [intent]);

  if (!isVoiceOpen) return null;

  const close = () => { cancel(); setVoiceOpen(false); setTextInput(""); setShowAddExample(false); };

  const handleSubmitText = () => {
    if (!textInput.trim()) return;
    submitText(textInput.trim());
    setTextInput("");
  };

  const handleAddExample = async () => {
    if (!newExample.trim()) return;
    const updated = [...customExamples, newExample.trim()];
    setCustomExamples(updated);
    await saveVoiceExamples(updated);
    setNewExample("");
    setShowAddExample(false);
  };

  const handleRemoveExample = async (i: number) => {
    const updated = customExamples.filter((_, idx) => idx !== i);
    setCustomExamples(updated);
    await saveVoiceExamples(updated);
  };

  const handleConfirmEdited = async () => {
    if (!intent) return;
    const updatedIntent = { ...intent, data: editedIntent };
    setIntent(updatedIntent);
    await confirm(updatedIntent);
  };

  const allExamples = [...customExamples, ...DEFAULT_EXAMPLES];

  const overlayStyle = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.97)",
    zIndex: 100, display: "flex", flexDirection: "column" as const,
    alignItems: "center", overflowY: "auto" as const, padding: "32px 24px 120px",
  };

  const inputStyle = {
    width: "100%", background: "#18181b", border: "1px solid #27272a",
    borderRadius: "16px", padding: "16px", color: "white", fontSize: "15px",
    outline: "none", resize: "none" as const, boxSizing: "border-box" as const,
  };

  // Recording
  if (state === "recording") return (
    <div style={{ ...overlayStyle, justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 20px rgba(239,68,68,0.15)" }}>
          <span style={{ fontSize: "32px" }}>🎙️</span>
        </div>
        <p style={{ color: "white", fontSize: "18px", fontWeight: 600 }}>Listening...</p>
        <p style={{ color: "#52525b", fontSize: "12px" }}>Speak naturally — "ate 2 eggs", "walked a mile"</p>
        <button onClick={() => stop()} style={{ padding: "12px 28px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
          Done
        </button>
        <button onClick={close} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );

  // Processing
  if (state === "processing") return (
    <div style={{ ...overlayStyle, justifyContent: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Processing...</p>
    </div>
  );

  // Confirming — editable
  if (state === "confirming" && intent) {
    const isNutrition = intent.domain === "nutrition_add";
    const isSteps = intent.domain === "steps_update";
    const domainLabel = intent.domain.replace("_", " ").replace("_", " ");
    const emoji = isNutrition ? "🥗" : isSteps ? "👟" : intent.domain === "hydration_add" ? "💧" : intent.domain === "sleep_log" ? "😴" : intent.domain === "task_create" ? "✅" : "💰";

    const editableFields = isNutrition
      ? [
          { key: "food", label: "Food", type: "text" },
          { key: "calories", label: "Calories", type: "number" },
          { key: "protein", label: "Protein (g)", type: "number" },
          { key: "carbs", label: "Carbs (g)", type: "number" },
          { key: "fat", label: "Fat (g)", type: "number" },
          { key: "fiber", label: "Fiber (g)", type: "number" },
        ]
      : isSteps
      ? [{ key: "count", label: "Steps", type: "number" }, { key: "activity", label: "Activity", type: "text" }]
      : Object.entries(intent.data).filter(([k]) => !["source", "meal"].includes(k)).map(([k, v]) => ({
          key: k, label: k.charAt(0).toUpperCase() + k.slice(1), type: typeof v === "number" ? "number" : "text",
        }));

    return (
      <div style={overlayStyle}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "32px", marginBottom: "8px" }}>{emoji}</p>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Confirm Log</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{domainLabel}</p>
            {intent.rawTranscript && (
              <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "6px", fontStyle: "italic" }}>"{intent.rawTranscript}"</p>
            )}
          </div>

          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Edit before saving</p>
            {editableFields.map(({ key, label, type }) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>{label}</p>
                <input
                  type={type}
                  value={editedIntent[key] ?? ""}
                  onChange={e => setEditedIntent(p => ({ ...p, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  style={{ background: "#27272a", border: "none", borderRadius: "8px", padding: "8px 12px", color: "white", fontSize: "13px", fontWeight: 600, textAlign: type === "number" ? "right" as const : "left" as const, outline: "none", flex: 1, maxWidth: type === "number" ? "100px" : "200px", boxSizing: "border-box" as const }}
                />
              </div>
            ))}
          </div>

          {intent.confidence < 0.85 && (
            <div style={{ background: "#1c1400", border: "1px solid #f59e0b", borderRadius: "12px", padding: "10px 14px" }}>
              <p style={{ color: "#f59e0b", fontSize: "11px" }}>⚠️ Low confidence — please review the values above</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={close} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleConfirmEdited} style={{ flex: 2, padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
              Save →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (state === "success") return (
    <div style={{ ...overlayStyle, justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "28px" }}>✓</span>
        </div>
        <p style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>Logged!</p>
      </div>
    </div>
  );

  // Error
  if (state === "error") return (
    <div style={{ ...overlayStyle, justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" as const }}>
        <p style={{ fontSize: "28px" }}>🤔</p>
        <p style={{ color: "white", fontSize: "16px", fontWeight: 700 }}>Couldn't understand that</p>
        <p style={{ color: "#71717a", fontSize: "13px" }}>{error}</p>
        <p style={{ color: "#52525b", fontSize: "12px" }}>Try being more specific, like "walked 2 miles" or "ate 2 eggs 150 calories"</p>
        <button onClick={() => { cancel(); }}
          style={{ padding: "12px 24px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
          Try Again
        </button>
        <button onClick={close} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );

  // Default — text input mode (always shown first)
  return (
    <div style={overlayStyle}>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Quick Log</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "2px" }}>What did you do?</p>
          </div>
          <button onClick={start}
              style={{ width: "48px", height: "48px", borderRadius: "50%", background: speechSupported ? "#ef4444" : "#27272a", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              🎙️
            </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitText(); } }}
            placeholder='e.g. "ate 2 eggs", "walked a mile", "drank 3 glasses of water"'
            rows={3}
            style={inputStyle}
          />
          <button onClick={handleSubmitText} disabled={!textInput.trim()}
            style={{ width: "100%", padding: "16px", borderRadius: "16px", background: textInput.trim() ? "white" : "#27272a", color: textInput.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            Log It
          </button>
        </div>

        {/* Examples */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#3f3f46", textTransform: "uppercase" }}>Examples — tap to use</p>
            <button onClick={() => setShowAddExample(!showAddExample)}
              style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", cursor: "pointer", letterSpacing: "0.05em" }}>
              {showAddExample ? "Cancel" : "+ Add yours"}
            </button>
          </div>

          {showAddExample && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="e.g. did 50 pushups"
                value={newExample}
                onChange={e => setNewExample(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddExample()}
                style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "10px 12px", color: "white", fontSize: "13px", outline: "none" }}
              />
              <button onClick={handleAddExample}
                style={{ padding: "10px 14px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                Save
              </button>
            </div>
          )}

          {/* Custom examples */}
          {customExamples.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {customExamples.map((cmd, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button onClick={() => setTextInput(cmd)} style={{ flex: 1, textAlign: "left" as const, background: "#1a1a2e", border: "1px solid #3b82f6", borderRadius: "10px", padding: "8px 12px", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}>
                    ⭐ {cmd}
                  </button>
                  <button onClick={() => handleRemoveExample(i)}
                    style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "16px", cursor: "pointer", padding: "4px 6px" }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Default examples */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {DEFAULT_EXAMPLES.map((cmd, i) => (
              <button key={i} onClick={() => setTextInput(cmd)}
                style={{ textAlign: "left" as const, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "8px 12px", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>
                {cmd}
              </button>
            ))}
          </div>
        </div>

        <button onClick={close}
          style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", padding: "8px" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
