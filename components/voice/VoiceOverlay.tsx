"use client";
import { useEffect } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useVoice } from "@/hooks/useVoice";

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen, refreshMomentum, refreshNutrition } = useLifeStore();
  const { state, transcript, intent, error, start, confirm, cancel } = useVoice();

  useEffect(() => {
    if (isVoiceOpen && state === "idle") start();
  }, [isVoiceOpen]);

  useEffect(() => {
    if (state === "success") {
      refreshMomentum();
      refreshNutrition();
      setTimeout(() => setVoiceOpen(false), 1200);
    }
  }, [state]);

  if (!isVoiceOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {state === "recording" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#ef4444", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <p style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>Listening...</p>
            <p style={{ color: "#52525b", fontSize: "12px", marginTop: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Speak now</p>
          </div>
        )}

        {state === "processing" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>Processing...</p>
          </div>
        )}

        {state === "confirming" && intent && (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Confirm</p>
            <p style={{ color: "white", fontSize: "16px", fontWeight: 600 }}>"{transcript}"</p>
            <div style={{ background: "#27272a", borderRadius: "16px", padding: "16px" }}>
              <p style={{ fontSize: "9px", color: "#52525b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>Parsed as</p>
              <p style={{ color: "#34d399", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{intent.domain.replace("_", " ")}</p>
              {Object.entries(intent.data).map(([k, v]) => (
                <p key={k} style={{ color: "#a1a1aa", fontSize: "12px", marginTop: "4px" }}>{k}: <span style={{ color: "white" }}>{String(v)}</span></p>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={cancel} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "none", border: "1px solid #27272a", color: "#71717a", fontWeight: 600, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Cancel</button>
              <button onClick={confirm} style={{ flex: 2, padding: "14px", borderRadius: "14px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        )}

        {state === "success" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#059669", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>Saved!</p>
          </div>
        )}

        {state === "error" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#f87171", fontWeight: 700, fontSize: "18px" }}>Error</p>
            <p style={{ color: "#52525b", fontSize: "13px", marginTop: "8px" }}>{error}</p>
            <button onClick={cancel} style={{ marginTop: "16px", padding: "12px 24px", borderRadius: "14px", background: "#27272a", border: "none", color: "#a1a1aa", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {(state === "recording" || state === "confirming") && (
          <button onClick={() => { cancel(); setVoiceOpen(false); }}
            style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", textAlign: "center" }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
