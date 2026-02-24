"use client";
import { useLifeStore } from "@/store/useLifeStore";

export default function MicButton() {
  const { isVoiceOpen, setVoiceOpen } = useLifeStore();

  return (
    <button
      onClick={() => setVoiceOpen(!isVoiceOpen)}
      className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 ${
        isVoiceOpen
          ? "bg-red-500 shadow-lg shadow-red-500/30"
          : "bg-white shadow-xl shadow-black/40"
      }`}
      aria-label="Voice log"
    >
      {isVoiceOpen ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
    </button>
  );
}
