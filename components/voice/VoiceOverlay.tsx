"use client";
import { useState } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useVoice } from "@/hooks/useVoice";

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen } = useLifeStore();
  const { state, intent, error, speechSupported, start, stop, confirm, cancel, submitText } = useVoice();
  const [textInput, setTextInput] = useState("");

  if (!isVoiceOpen) return null;

  const handleOpen = () => {
    if (state === "idle") start();
  };

  if (state === "idle") {
    handleOpen();
  }

  const close = () => { cancel(); setVoiceOpen(false); setTextInput(""); };

  const handleSubmitText = () => {
    if (!textInput.trim()) return;
    submitText(textInput.trim());
    setTextInput("");
  };

  const overlayStyle = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.95)",
    zIndex: 100, display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", padding: "32px",
  };

  const exampleCommands = [
    "drank 500ml of water",
    "slept 7.5 hours quality 4",
    "walked 8000 steps",
    "ate 2 eggs, 180 calories, 12g protein",
    "add task buy groceries priority 1",
    "logged a push workout 45 minutes RPE 7",
  ];

  // Text input mode (iOS Safari PWA or speech failed)
  if (state === "text_input" || (!speechSupported && state === "idle")) {
    return (
      <div style={overlayStyle}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>⌨️</p>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Log Entry</p>
            <p style={{ color: "#71717a", fontSize: "13px" }}>Type what you want to log</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <textarea
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitText(); } }}
              placeholder="e.g. drank 500ml of water"
              rows={2}
              style={{ width: "100%", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", color: "white", fontSize: "15px", outline: "none", resize: "none", boxSizing: "border-box" as const }}
            />
            <button onClick={handleSubmitText} disabled={!textInput.trim()}
              style={{ width: "100%", padding: "16px", borderRadius: "16px", background: textInput.trim() ? "white" : "#27272a", color: textInput.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
              Log It
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#3f3f46", textTransform: "uppercase", marginBottom: "4px" }}>Examples</p>
            {exampleCommands.map((cmd, i) => (
              <button key={i} onClick={() => setTextInput(cmd)}
                style={{ textAlign: "left", background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "8px 12px", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>
                {cmd}
              </button>
            ))}
          </div>

          <button onClick={close}
            style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", padding: "8px" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Recording state
  if (state === "recording") {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 20px rgba(239,68,68,0.15)" }}>
            <span style={{ fontSize: "32px" }}>🎙️</span>
          </div>
          <p style={{ color: "white", fontSize: "18px", fontWeight: 600 }}>Listening...</p>
          <button onClick={() => stop()} style={{ padding: "12px 28px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            Done
          </button>
          <button onClick={close} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  // Processing state
  if (state === "processing") {
    return (
      <div style={overlayStyle}>
        <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Processing...</p>
      </div>
    );
  }

  // Confirming state
  if (state === "confirming" && intent) {
    return (
      <div style={overlayStyle}>
        <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>Confirm Log</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{intent.domain.replace("_", " ")}</p>
          </div>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(intent.data).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "11px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{k}</p>
                <p style={{ fontSize: "13px", color: "white", fontWeight: 600 }}>{String(v)}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={close} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={confirm} style={{ flex: 2, padding: "14px", borderRadius: "14px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "28px" }}>✓</span>
          </div>
          <p style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>Logged!</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div style={overlayStyle}>
        <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" }}>
          <p style={{ fontSize: "28px" }}>❌</p>
          <p style={{ color: "#f87171", fontSize: "14px" }}>{error || "Something went wrong"}</p>
          <button onClick={() => { cancel(); setVoiceOpen(true); start(); }}
            style={{ padding: "12px 24px", borderRadius: "12px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
            Try Again
          </button>
          <button onClick={close} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return null;
}
