"use client";
import { useState, useEffect, useRef } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useVoice } from "@/hooks/useVoice";
import { getVoiceExamples, saveVoiceExamples } from "@/lib/supabase/queries";

const DEFAULT_EXAMPLES = [
  "drank 2 glasses of water",
  "slept 7.5 hours",
  "walked a mile",
  "ran 5k",
  "ate 2 eggs and toast",
  "add task buy groceries",
  "spent $15 on lunch",
  "logged push workout 45 minutes RPE 7",
];

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen } = useLifeStore();
  const { state, intent, setIntent, error, transcript, speechSupported, start, stop, confirm, cancel, submitText } = useVoice();
  const [textInput, setTextInput] = useState("");
  const [customExamples, setCustomExamples] = useState<string[]>([]);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExample, setNewExample] = useState("");
  const [editedIntent, setEditedIntent] = useState<Record<string, any>>({});
  const [mode, setMode] = useState<"listening" | "quickadd">("listening");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (isVoiceOpen && !hasStarted.current) {
      hasStarted.current = true;
      setMode("listening");
      start();
    }
    if (!isVoiceOpen) hasStarted.current = false;
  }, [isVoiceOpen]);

  useEffect(() => {
    getVoiceExamples().then(ex => setCustomExamples(ex)).catch(() => {});
  }, []);

  useEffect(() => {
    if (intent?.data) setEditedIntent({ ...intent.data });
  }, [intent]);

  if (!isVoiceOpen) return null;

  const close = () => {
    cancel();
    setVoiceOpen(false);
    setTextInput("");
    setShowAddExample(false);
    setMode("listening");
    hasStarted.current = false;
  };

  const goToQuickAdd = (prefill?: string) => {
    cancel();
    setMode("quickadd");
    if (prefill) setTextInput(prefill);
  };

  const handleSubmitText = () => {
    if (!textInput.trim()) return;
    submitText(textInput.trim());
    setTextInput("");
  };

  const handleRedo = () => {
    cancel();
    setMode("listening");
    setTimeout(() => start(), 100);
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
    await confirm({ ...intent, data: editedIntent });
  };

  const overlay = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.97)",
    zIndex: 100, display: "flex", flexDirection: "column" as const,
    alignItems: "center", overflowY: "auto" as const, padding: "48px 24px 120px",
  };

  // ── LISTENING ──────────────────────────────────────────────
  if (state === "recording") return (
    <div style={{ ...overlay, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px" }}>
        {/* Pulsing mic */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: "-16px", borderRadius: "50%", background: "rgba(239,68,68,0.15)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "36px" }}>🎙️</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "white", fontSize: "20px", fontWeight: 700 }}>Listening...</p>
          <p style={{ color: "#52525b", fontSize: "13px", marginTop: "8px" }}>Say anything — "ate eggs", "walked a mile"</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => goToQuickAdd()}
            style={{ padding: "12px 20px", borderRadius: "12px", background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            ⌨️ Quick Add
          </button>
          <button onClick={() => stop()}
            style={{ padding: "12px 24px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
            Done
          </button>
          <button onClick={close}
            style={{ padding: "12px 20px", borderRadius: "12px", background: "#18181b", border: "1px solid #27272a", color: "#71717a", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 0.2; } }`}</style>
    </div>
  );

  // ── PROCESSING ────────────────────────────────────────────
  if (state === "processing") return (
    <div style={{ ...overlay, justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "2px solid #27272a", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Processing...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── LOW CONFIDENCE ────────────────────────────────────────
  if (state === "confirming" && intent && intent.confidence < 0.8) {
    const domainLabel = intent.domain.replace(/_/g, " ");
    const emoji = intent.domain.includes("nutrition") ? "🥗" : intent.domain.includes("steps") ? "👟" : intent.domain.includes("hydration") ? "💧" : intent.domain.includes("sleep") ? "😴" : intent.domain.includes("task") ? "✅" : "💰";
    return (
      <div style={{ ...overlay, justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "32px", marginBottom: "8px" }}>🤔</p>
            <p style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>I think I got it...</p>
            <p style={{ color: "#52525b", fontSize: "13px", marginTop: "6px" }}>Not totally sure — double check below</p>
          </div>

          <div style={{ background: "#1c1400", border: "1px solid #f59e0b", borderRadius: "20px", padding: "16px 20px" }}>
            <p style={{ fontSize: "10px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>⚠️ Low confidence — {Math.round(intent.confidence * 100)}% sure</p>
            <p style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>{emoji} {domainLabel}</p>
            {Object.entries(intent.data).filter(([k]) => !["source"].includes(k)).slice(0, 4).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <p style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</p>
                <p style={{ color: "#a1a1aa", fontSize: "12px", fontWeight: 600 }}>{String(v)}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              onClick={() => { setIntent({ ...intent, confidence: 1 }); }}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
              ✓ Yeah that's right — Save
            </button>
            <button onClick={() => goToQuickAdd(transcript)}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              ✏️ Fix it in Quick Add
            </button>
            <button onClick={handleRedo}
              style={{ width: "100%", padding: "12px", borderRadius: "14px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              🎙️ Try Again
            </button>
          </div>
          <button onClick={close} style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "12px", cursor: "pointer", textAlign: "center" as const }}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── HIGH CONFIDENCE CONFIRM (editable) ────────────────────
  if (state === "confirming" && intent) {
    const domainLabel = intent.domain.replace(/_/g, " ");
    const emoji = intent.domain.includes("nutrition") ? "🥗" : intent.domain.includes("steps") ? "👟" : intent.domain.includes("hydration") ? "💧" : intent.domain.includes("sleep") ? "😴" : intent.domain.includes("task") ? "✅" : "💰";
    const isNutrition = intent.domain === "nutrition_add";
    const isSteps = intent.domain === "steps_update";

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
      <div style={overlay}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "32px", marginBottom: "8px" }}>{emoji}</p>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Confirm Log</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{domainLabel}</p>
            {transcript && <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "6px", fontStyle: "italic" }}>"{transcript}"</p>}
          </div>

          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tap any field to edit</p>
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

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleRedo}
              style={{ padding: "14px 16px", borderRadius: "14px", background: "#18181b", border: "1px solid #27272a", color: "#71717a", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              🎙️ Redo
            </button>
            <button onClick={close}
              style={{ padding: "14px 16px", borderRadius: "14px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleConfirmEdited}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
              Save →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────────
  if (state === "success") return (
    <div style={{ ...overlay, justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "28px" }}>✓</span>
        </div>
        <p style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>Logged!</p>
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────
  if (state === "error") return (
    <div style={{ ...overlay, justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" as const }}>
        <p style={{ fontSize: "32px" }}>🤷</p>
        <p style={{ color: "white", fontSize: "16px", fontWeight: 700 }}>Didn't catch that</p>
        <p style={{ color: "#71717a", fontSize: "13px", lineHeight: "1.6" }}>Try being specific — "walked 2 miles", "ate 2 eggs 150 calories", "drank a glass of water"</p>
        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
          <button onClick={handleRedo}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
            🎙️ Try Again
          </button>
          <button onClick={() => goToQuickAdd(transcript)}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            ⌨️ Quick Add
          </button>
        </div>
        <button onClick={close} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );

  // ── QUICK ADD (text mode) ─────────────────────────────────
  return (
    <div style={overlay}>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Quick Add</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "2px" }}>What did you do?</p>
          </div>
          <button onClick={handleRedo}
            style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
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
            style={{ width: "100%", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", color: "white", fontSize: "15px", outline: "none", resize: "none" as const, boxSizing: "border-box" as const }}
          />
          <button onClick={handleSubmitText} disabled={!textInput.trim()}
            style={{ width: "100%", padding: "16px", borderRadius: "16px", background: textInput.trim() ? "white" : "#27272a", color: textInput.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            Log It
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#3f3f46", textTransform: "uppercase" }}>Examples — tap to use</p>
            <button onClick={() => setShowAddExample(!showAddExample)}
              style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", cursor: "pointer" }}>
              {showAddExample ? "Cancel" : "+ Add yours"}
            </button>
          </div>

          {showAddExample && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input autoFocus placeholder="e.g. did 50 pushups" value={newExample}
                onChange={e => setNewExample(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddExample()}
                style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "10px 12px", color: "white", fontSize: "13px", outline: "none" }} />
              <button onClick={handleAddExample}
                style={{ padding: "10px 14px", borderRadius: "10px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                Save
              </button>
            </div>
          )}

          {customExamples.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {customExamples.map((cmd, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button onClick={() => setTextInput(cmd)}
                    style={{ flex: 1, textAlign: "left" as const, background: "#1a1a2e", border: "1px solid #3b82f6", borderRadius: "10px", padding: "8px 12px", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}>
                    ⭐ {cmd}
                  </button>
                  <button onClick={() => handleRemoveExample(i)}
                    style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "16px", cursor: "pointer", padding: "4px 6px" }}>×</button>
                </div>
              ))}
            </div>
          )}

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
