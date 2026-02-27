"use client";
import { useLifeStore } from "@/store/useLifeStore";

export default function MicButton() {
  const { setVoiceOpen } = useLifeStore();
  return (
    <button
      onClick={() => setVoiceOpen(true)}
      style={{
        position: "fixed", bottom: "72px", left: "50%", transform: "translateX(-50%)",
        width: "52px", height: "52px", borderRadius: "50%", background: "white",
        border: "none", cursor: "pointer", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ fontSize: "20px" }}>🎙️</span>
    </button>
  );
}
