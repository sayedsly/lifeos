"use client";
import { useState, useEffect, useRef } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { executeAgentAction, speak, getAvailableVoices, appendAgentHistory } from "@/lib/agent";
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

const DOMAIN_META: Record<string, { emoji: string; color: string; bg: string }> = {
  nutrition_add:   { emoji: "🥗", color: "#15803d", bg: "#dcfce7" },
  hydration_add:   { emoji: "💧", color: "#1d4ed8", bg: "#dbeafe" },
  sleep_log:       { emoji: "😴", color: "#6d28d9", bg: "#ede9fe" },
  steps_update:    { emoji: "👟", color: "#92400e", bg: "#fef3c7" },
  task_create:     { emoji: "✅", color: "#3730a3", bg: "#e0e7ff" },
  finance_expense: { emoji: "💰", color: "#92400e", bg: "#fef3c7" },
  finance_goal_add:{ emoji: "🎯", color: "#0369a1", bg: "#e0f2fe" },
};

const sheet: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 200,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)" as any,
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  paddingBottom: "120px",
};

const card: React.CSSProperties = {
  width: "100%", maxWidth: 480,
  background: "white",
  borderRadius: "32px 32px 0 0",
  padding: "32px 24px 52px",
  boxShadow: "0 -12px 60px rgba(0,0,0,0.25)",
  minHeight: "380px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
};

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen } = useLifeStore();
  const { state, intent, setIntent, error, transcript, speechSupported, start, stop, confirm, cancel, submitText, agentResult, setAgentResult } = useVoice();
  const [textInput, setTextInput] = useState("");
  const [customExamples, setCustomExamples] = useState<string[]>([]);
  const [showAddExample, setShowAddExample] = useState(false);
  const [newExample, setNewExample] = useState("");
  const [editedIntent, setEditedIntent] = useState<Record<string, any>>({});
  const [mode, setMode] = useState<"listening" | "quickadd">("listening");
  const [agentSaving, setAgentSaving] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [agentDone, setAgentDone] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<{role:"user"|"ai";text:string}[]>([]);
  const [followUpText, setFollowUpText] = useState("");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{name:string;lang:string}[]>([]);
  const hasStarted = useRef(false);
  useEffect(() => {
    const load = () => {
      const v = getAvailableVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    if (isVoiceOpen && !hasStarted.current) {
      hasStarted.current = true;
      setMode("listening");
      setTimeout(() => { start(); }, 50);
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

  const handleAgentConfirm = async () => {
    if (!agentResult?.action || agentResult.action.type === "none") {
      setVoiceOpen(false);
      return;
    }
    setAgentSaving(true);
    try {
      await executeAgentAction(agentResult.action);
      setAgentDone(true);
      // no auto-speak after action
      setTimeout(() => { setVoiceOpen(false); setAgentResult(null); setAgentDone(false); window.location.reload(); }, 2000);
    } catch (e: any) { console.error(e); }
    setAgentSaving(false);
  };

  const handleAgentReject = () => {
    setAgentResult(null);
    cancel();
    setMode("listening");
    setTimeout(() => start(), 150);
  };

  const handleAgentFollowUp = () => {
    setAgentResult(null);
    setMode("listening");
    setTimeout(() => start(), 50);
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
    const routes: Record<string, string> = {
      nutrition_add: "/nutrition", hydration_add: "/",
      sleep_log: "/", steps_update: "/",
      task_create: "/tasks", finance_goal_add: "/finance", finance_expense: "/finance",
    };
    const route = routes[intent.domain] || "/";
    setTimeout(() => { setVoiceOpen(false); window.location.href = route; }, 1200);
  };

  const meta = intent ? (DOMAIN_META[intent.domain] || { emoji: "📝", color: "#374151", bg: "#f3f4f6" }) : null;

  // ── AGENT RESPONSE ──
  if (state === "confirming" && agentResult) {
    const hasAction = agentResult.action && agentResult.action.type !== "none";
    return (
      <div style={sheet} onClick={close}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: 40, height: 40, borderRadius: "12px", background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>✨</div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>AI Response</p>
              {transcript && <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>"{transcript}"</p>}
            </div>
            <button onClick={() => speak(agentResult.text, selectedVoice || undefined)}
              style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: "10px", background: "#f0fdf4", border: "none", cursor: "pointer", fontSize: "16px" }}>
              🔊
            </button>
          </div>

          {chatHistory.length > 2 && (
            <div style={{ maxHeight: "120px", overflowY: "auto" as const, marginBottom: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {chatHistory.slice(-6, -2).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "7px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#e0e7ff" : "#f7f8fc", fontSize: "11px", color: m.role === "user" ? "#3730a3" : "#374151", fontWeight: 600, lineHeight: 1.5 }}>
                    {m.text.slice(0, 120)}{m.text.length > 120 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: "#f7f8fc", borderRadius: "18px", padding: "16px", marginBottom: "14px" }}>
            <p style={{ fontSize: "14px", color: "#374151", fontWeight: 600, lineHeight: 1.6 }}>{agentResult.text}</p>
          </div>

          {hasAction && agentResult.action && (
            <div style={{ background: "linear-gradient(135deg,#e0e7ff,#ede9fe)", borderRadius: "14px", padding: "12px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "6px" }}>Proposed Action</p>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#3730a3" }}>
                {agentResult.action.type === "nutrition_log" && `🍽️ Log: ${agentResult.action.data?.food} (${agentResult.action.data?.calories} cal)`}
                {agentResult.action.type === "macro_targets" && `🎯 Update macros: ${agentResult.action.data?.calories} kcal, P:${agentResult.action.data?.protein}g C:${agentResult.action.data?.carbs}g F:${agentResult.action.data?.fat}g`}
                {agentResult.action.type === "finance_split" && `💰 Split across ${agentResult.action.data?.splits?.length || "?"} goals`}
                {agentResult.action.type === "finance_goal_add" && `💰 Create goal: ${(agentResult.action.data?.goals || [agentResult.action.data]).map((g:any) => g.name).join(", ")}`}
                {agentResult.action.type === "workout_plan" && `💪 Save workout: ${agentResult.action.data?.name} (${agentResult.action.data?.exercises?.length || "?"} exercises)`}
                {agentResult.action.type === "task_add" && `✅ Add ${Array.isArray(agentResult.action.data?.tasks) ? agentResult.action.data.tasks.length + " tasks" : '"' + (agentResult.action.data?.title || agentResult.action.data) + '"'}`}
                {agentResult.action.type === "hydration_log" && `💧 Log ${agentResult.action.data?.amount}ml water`}
                {agentResult.action.type === "sleep_log" && `😴 Log sleep: ${agentResult.action.data?.duration}h`}
                {agentResult.action.type === "body_weight" && `⚖️ Log weight: ${agentResult.action.data?.weight}${agentResult.action.data?.unit || "lbs"}`}
                {!["nutrition_log","macro_targets","finance_split","finance_goal_add","workout_plan","task_add","hydration_log","sleep_log","body_weight"].includes(agentResult.action.type) && `Action: ${agentResult.action.type}`}
              </p>
            </div>
          )}

          {/* Voice picker */}
          <div style={{ marginBottom: "8px" }}>
            <button onClick={() => setShowVoicePicker(!showVoicePicker)}
              style={{ padding: "6px 12px", background: "#f7f8fc", border: "none", borderRadius: "8px", fontSize: "10px", fontWeight: 700, color: "#9ca3af", cursor: "pointer", fontFamily: "inherit" }}>
              🔊 Voice: {selectedVoice ? selectedVoice.split(" ").slice(0,2).join(" ") : "Default"}
            </button>
            {showVoicePicker && availableVoices.length > 0 && (
              <div style={{ marginTop: "6px", background: "#f7f8fc", borderRadius: "12px", padding: "8px", maxHeight: "120px", overflowY: "auto" as const }}>
                <button onClick={() => { setSelectedVoice(""); setShowVoicePicker(false); }}
                  style={{ display: "block", width: "100%", padding: "6px 10px", background: !selectedVoice ? "#e0e7ff" : "transparent", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, color: !selectedVoice ? "#4338ca" : "#6b7280", cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const, marginBottom: "2px" }}>
                  ✨ Auto (Best available)
                </button>
                {availableVoices.slice(0, 12).map(v => (
                  <button key={v.name} onClick={() => { setSelectedVoice(v.name); setShowVoicePicker(false); speak("Hi, I am " + v.name.split(" ")[0], v.name); }}
                    style={{ display: "block", width: "100%", padding: "6px 10px", background: selectedVoice === v.name ? "#e0e7ff" : "transparent", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: selectedVoice === v.name ? 700 : 500, color: selectedVoice === v.name ? "#4338ca" : "#6b7280", cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const, marginBottom: "2px" }}>
                    {selectedVoice === v.name ? "✓ " : ""}{(v as any).label || v.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {agentDone ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ fontSize: "28px", marginBottom: "6px" }}>✅</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>Done!</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAgentReject}
                style={{ padding: "13px 14px", borderRadius: "14px", background: "#fef2f2", border: "none", color: "#ef4444", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                🔄 Redo
              </button>
              <button onClick={close}
                style={{ padding: "13px 14px", borderRadius: "14px", background: "#f1f5f9", border: "none", color: "#6b7280", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                ✕
              </button>
              {hasAction ? (
                <button onClick={handleAgentConfirm} disabled={agentSaving}
                  style={{ flex: 1, padding: "13px", borderRadius: "14px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  {agentSaving ? "Saving..." : "Apply ✓"}
                </button>
              ) : (
                <button onClick={() => { speak(agentResult.text, selectedVoice || undefined); }}
                  style={{ flex: 1, padding: "13px", borderRadius: "14px", background: "#f0fdf4", border: "none", color: "#16a34a", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  🔊 Read Aloud
                </button>
              )}
            </div>
          )}

          {/* Follow-up */}
          {!agentDone && (
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <input value={followUpText} onChange={e => setFollowUpText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && followUpText.trim()) { const t = followUpText.trim(); setFollowUpText(""); setAgentResult(null); submitText(t); } }}
                placeholder="Ask a follow-up..."
                style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "11px 14px", fontSize: "13px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit" }} />
              <button onClick={() => { if (followUpText.trim()) { const t = followUpText.trim(); setFollowUpText(""); setAgentResult(null); submitText(t); } else { handleAgentFollowUp(); } }}
                style={{ width: 46, height: 46, borderRadius: "12px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "white", fontSize: "20px", cursor: "pointer", flexShrink: 0 }}>
                {followUpText.trim() ? "→" : "🎙️"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LISTENING ──
  if (state === "recording" || (mode === "listening" && state === "idle")) return (
    <div style={sheet}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: "11px", fontWeight: 800, color: "#9ca3af", textAlign: "center", letterSpacing: "0.2em", marginBottom: "20px" }}>
          {speechSupported ? "LISTENING..." : "QUICK ADD"}
        </p>

        {/* Animated mic */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "22px", position: "relative", height: 100 }}>
          {state === "recording" && [90, 68, 48].map((size, i) => (
            <div key={i} style={{
              position: "absolute", top: "50%", left: "50%",
              width: size, height: size,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `rgba(102,126,234,${0.07 + i * 0.05})`,
              animation: `vpulse ${1.1 + i * 0.25}s ease-in-out infinite`,
            }} />
          ))}
          <div style={{
            width: 64, height: 64, borderRadius: "20px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", zIndex: 1, position: "relative",
            boxShadow: "0 6px 24px rgba(102,126,234,0.35)",
          }}>🎙️</div>
        </div>

        <p style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 600, textAlign: "center", marginBottom: "22px" }}>
          {speechSupported ? "Say anything — &quot;ate eggs&quot;, &quot;walked 3k steps&quot;" : "Voice not available — use Quick Add below"}
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <button onClick={() => goToQuickAdd()}
            style={{ flex: 1, padding: "13px", borderRadius: "14px", background: "#f1f5f9", border: "none", color: "#374151", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            ⌨️ Quick Add
          </button>
          {speechSupported && (
            <button onClick={() => stop()}
              style={{ flex: 1, padding: "13px", borderRadius: "14px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              Done ✓
            </button>
          )}
          <button onClick={close}
            style={{ padding: "13px 16px", borderRadius: "14px", background: "#fef2f2", border: "none", color: "#ef4444", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            ✕
          </button>
        </div>
        <style>{`@keyframes vpulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5} 50%{transform:translate(-50%,-50%) scale(1.12);opacity:1} }`}</style>
      </div>
    </div>
  );

  // ── PROCESSING ──
  if (state === "processing") return (
    <div style={sheet}>
      <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", paddingTop: "40px", paddingBottom: "48px" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#6366f1", animation: "vspin 0.7s linear infinite" }} />
        <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600, letterSpacing: "0.1em" }}>Processing...</p>
        <style>{`@keyframes vspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ── LOW CONFIDENCE ──
  if (state === "confirming" && intent && !agentResult && intent.confidence < 0.8) return (
    <div style={sheet} onClick={close}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <span style={{ fontSize: "36px" }}>🤔</span>
          <p style={{ fontSize: "17px", fontWeight: 800, color: "#111118", marginTop: "8px" }}>I think I got it...</p>
          <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Double check below — {Math.round(intent.confidence * 100)}% confident</p>
        </div>

        <div style={{ background: meta?.bg || "#f7f8fc", borderRadius: "20px", padding: "16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: meta?.color || "#374151" }}>{meta?.emoji} {intent.domain.replace(/_/g, " ")}</p>
          {Object.entries(intent.data).filter(([k]) => !["source"].includes(k)).slice(0, 4).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
              <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</p>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>{String(v)}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={handleConfirmEdited}
            style={{ padding: "14px", borderRadius: "14px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            ✓ That's right — Save
          </button>
          <button onClick={() => goToQuickAdd(transcript)}
            style={{ padding: "13px", borderRadius: "14px", background: "#f1f5f9", border: "none", color: "#374151", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            ✏️ Fix in Quick Add
          </button>
          <button onClick={handleRedo}
            style={{ padding: "12px", borderRadius: "14px", background: "none", border: "1.5px solid #e5e7eb", color: "#6b7280", fontWeight: 600, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            🎙️ Try Again
          </button>
          <button onClick={close} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", padding: "6px" }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // ── HIGH CONFIDENCE CONFIRM (editable) ──
  if (state === "confirming" && intent && !agentResult) {
    const isNutrition = intent.domain === "nutrition_add";
    const isSteps = intent.domain === "steps_update";
    const editableFields = isNutrition
      ? [
          { key: "food", label: "Food", type: "text" },
          { key: "calories", label: "Calories", type: "number" },
          { key: "protein", label: "Protein (g)", type: "number" },
          { key: "carbs", label: "Carbs (g)", type: "number" },
          { key: "fat", label: "Fat (g)", type: "number" },
        ]
      : isSteps
      ? [{ key: "count", label: "Steps", type: "number" }, { key: "activity", label: "Activity", type: "text" }]
      : Object.entries(intent.data).filter(([k]) => !["source", "meal"].includes(k)).map(([k, v]) => ({
          key: k, label: k.charAt(0).toUpperCase() + k.slice(1), type: typeof v === "number" ? "number" : "text",
        }));

    return (
      <div style={sheet}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "14px", background: meta?.bg || "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
              {meta?.emoji || "📝"}
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Confirm</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#111118", textTransform: "capitalize" }}>{intent.domain.replace(/_/g, " ")}</p>
            </div>
            {transcript && <p style={{ marginLeft: "auto", fontSize: "10px", color: "#9ca3af", fontStyle: "italic", maxWidth: "100px", textAlign: "right" as const }}>"{transcript}"</p>}
          </div>

          <div style={{ background: "#f7f8fc", borderRadius: "18px", padding: "14px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>Tap to edit</p>
            {editableFields.map(({ key, label, type }) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, flexShrink: 0 }}>{label}</p>
                <input
                  type={type}
                  value={editedIntent[key] ?? ""}
                  onChange={e => setEditedIntent(p => ({ ...p, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  style={{
                    background: "white", border: "1.5px solid #e5e7eb", borderRadius: "10px",
                    padding: "8px 12px", color: "#111118", fontSize: "13px", fontWeight: 700,
                    textAlign: type === "number" ? "right" as const : "left" as const,
                    outline: "none", flex: 1, maxWidth: type === "number" ? "100px" : "200px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleRedo}
              style={{ padding: "13px 14px", borderRadius: "14px", background: "#f1f5f9", border: "none", color: "#374151", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              🔄
            </button>
            <button onClick={close}
              style={{ padding: "13px 14px", borderRadius: "14px", background: "#fef2f2", border: "none", color: "#ef4444", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              ✕
            </button>
            <button onClick={handleConfirmEdited}
              style={{ flex: 1, padding: "13px", borderRadius: "14px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              Save →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS ──
  if (state === "success") return (
    <div style={sheet}>
      <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", paddingTop: "36px", paddingBottom: "44px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "20px", background: "linear-gradient(135deg,#86efac,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", boxShadow: "0 6px 24px rgba(34,197,94,0.3)" }}>✓</div>
        <p style={{ fontSize: "20px", fontWeight: 800, color: "#111118" }}>Logged!</p>
        <p style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 600 }}>Nice work 💪</p>
      </div>
    </div>
  );

  // ── RATE LIMITED ──
  if (state === "error" && error === "RATE_LIMITED") return (
    <div style={sheet} onClick={close}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontSize: "48px", marginBottom: "12px" }}>😅</p>
          <p style={{ fontSize: "18px", fontWeight: 900, color: "#111118", marginBottom: "8px" }}>Cmon bro, chill</p>
          <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600, lineHeight: 1.6, marginBottom: "20px" }}>
            You have hit the daily AI limit (30 calls). Hit up Sayed to get your limit reset 🙏
          </p>
          <div style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", borderRadius: "16px", padding: "14px", marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>Resets automatically at midnight 🌙</p>
          </div>
          <button onClick={close}
            style={{ width: "100%", padding: "14px", background: "#111118", border: "none", borderRadius: "14px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            OK got it
          </button>
        </div>
      </div>
    </div>
  );

  // ── ERROR ──
  if (state === "error") return (
    <div style={sheet} onClick={close}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <span style={{ fontSize: "36px" }}>🤷</span>
          <p style={{ fontSize: "17px", fontWeight: 800, color: "#111118", marginTop: "8px" }}>Didn't catch that</p>
          <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px", lineHeight: 1.6 }}>Try: "walked 2 miles", "ate 2 eggs 150 cal", "drank a glass of water"</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleRedo}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            🎙️ Try Again
          </button>
          <button onClick={() => goToQuickAdd(transcript)}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "#f1f5f9", border: "none", color: "#374151", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            ⌨️ Quick Add
          </button>
        </div>
        <button onClick={close} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", padding: "10px", width: "100%", marginTop: "6px" }}>Cancel</button>
      </div>
    </div>
  );

  // ── QUICK ADD (text mode) ──
  return (
    <div style={sheet} onClick={close}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Quick Add</p>
            <p style={{ fontSize: "20px", fontWeight: 900, color: "#111118", marginTop: "2px" }}>What did you do?</p>
          </div>
          <button onClick={handleRedo}
            style={{ width: 46, height: 46, borderRadius: "14px", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", cursor: "pointer", fontSize: "20px", boxShadow: "0 4px 16px rgba(102,126,234,0.3)" }}>
            🎙️
          </button>
        </div>

        <textarea
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitText(); } }}
          placeholder="e.g. ate 2 eggs, walked 3k steps, drank 500ml water"
          rows={3}
          autoFocus
          style={{ width: "100%", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "16px", padding: "14px", color: "#111118", fontSize: "15px", fontWeight: 600, outline: "none", resize: "none" as const, boxSizing: "border-box" as const, fontFamily: "inherit", marginBottom: "10px" }}
        />
        <button onClick={handleSubmitText} disabled={!textInput.trim()}
          style={{ width: "100%", padding: "14px", borderRadius: "14px", background: textInput.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#e5e7eb", color: textInput.trim() ? "white" : "#9ca3af", fontWeight: 700, fontSize: "13px", border: "none", cursor: textInput.trim() ? "pointer" : "default", fontFamily: "inherit", marginBottom: "16px" }}>
          Log It →
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>Examples</p>
          <button onClick={() => setShowAddExample(!showAddExample)}
            style={{ background: "none", border: "none", color: "#6366f1", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {showAddExample ? "Cancel" : "+ Add yours"}
          </button>
        </div>

        {showAddExample && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input autoFocus placeholder="e.g. did 50 pushups" value={newExample}
              onChange={e => setNewExample(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddExample()}
              style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px", color: "#111118", fontSize: "13px", fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
            <button onClick={handleAddExample}
              style={{ padding: "10px 14px", borderRadius: "10px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "140px", overflowY: "auto" as const }}>
          {customExamples.map((cmd, i) => (
            <div key={i} style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setTextInput(cmd)}
                style={{ flex: 1, textAlign: "left" as const, background: "#ede9fe", border: "none", borderRadius: "10px", padding: "8px 12px", color: "#6d28d9", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ⭐ {cmd}
              </button>
              <button onClick={() => handleRemoveExample(i)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer", padding: "4px 6px" }}>×</button>
            </div>
          ))}
          {DEFAULT_EXAMPLES.map((cmd, i) => (
            <button key={i} onClick={() => setTextInput(cmd)}
              style={{ textAlign: "left" as const, background: "#f7f8fc", border: "none", borderRadius: "10px", padding: "8px 12px", color: "#6b7280", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {cmd}
            </button>
          ))}
        </div>

        <button onClick={close}
          style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", padding: "12px", width: "100%", marginTop: "8px" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}