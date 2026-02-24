"use client";
import { useEffect } from "react";
import { useLifeStore } from "@/store/useLifeStore";
import { useVoice } from "@/hooks/useVoice";

export default function VoiceOverlay() {
  const { isVoiceOpen, setVoiceOpen, refreshMomentum, refreshNutrition } = useLifeStore();
  const { state, transcript, pendingIntent, error, startRecording, stopRecording, confirmIntent, reset } = useVoice();

  useEffect(() => {
    if (isVoiceOpen) {
      reset();
      setTimeout(() => startRecording(), 300);
    } else {
      stopRecording();
      reset();
    }
  }, [isVoiceOpen]);

  useEffect(() => {
    if (state === "success") {
      refreshMomentum();
      refreshNutrition();
      setTimeout(() => {
        reset();
        setVoiceOpen(false);
      }, 1200);
    }
  }, [state]);

  if (!isVoiceOpen) return null;

  const close = () => {
    stopRecording();
    reset();
    setVoiceOpen(false);
  };

  const retry = () => {
    reset();
    setTimeout(() => startRecording(), 200);
  };

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-6">
        <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Voice Log</p>
        <button onClick={close} className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
          Cancel
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {state === "recording" && (
          <>
            <div className="w-24 h-24 rounded-full bg-white animate-pulse" />
            <p className="text-zinc-400 text-xs tracking-widest uppercase">Listening...</p>
            <button
              onClick={() => stopRecording()}
              className="mt-6 px-8 py-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs tracking-widest uppercase"
            >
              Done Speaking
            </button>
          </>
        )}

        {state === "processing" && (
          <p className="text-zinc-400 text-xs tracking-widest uppercase animate-pulse">Processing...</p>
        )}

        {state === "confirming" && pendingIntent && pendingIntent.domain !== "unknown" && (
          <div className="w-full space-y-4">
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase">You said</p>
            <p className="text-white text-xl font-semibold">"{transcript}"</p>
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 mt-2">
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">
                {pendingIntent.domain.replace(/_/g, " ")}
              </p>
              {Object.entries(pendingIntent.data).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm capitalize">{k}</span>
                  <span className="text-white text-sm font-semibold">
                    {typeof v === "number" ? Math.round(v as number) : String(v)}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={confirmIntent}
              className="w-full py-4 rounded-2xl bg-white text-black text-sm font-semibold tracking-widest uppercase mt-2"
            >
              Confirm & Log
            </button>
            <button
              onClick={retry}
              className="w-full py-4 rounded-2xl border border-zinc-800 text-zinc-400 text-xs tracking-widest uppercase"
            >
              Try Again
            </button>
          </div>
        )}

        {state === "confirming" && pendingIntent?.domain === "unknown" && (
          <div className="w-full space-y-4 text-center">
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase">You said</p>
            <p className="text-white text-xl font-semibold">"{transcript}"</p>
            <p className="text-zinc-600 text-sm mt-2">Couldn't understand that.</p>
            <button
              onClick={retry}
              className="w-full py-4 rounded-2xl bg-white text-black text-sm font-semibold tracking-widest uppercase mt-4"
            >
              Try Again
            </button>
          </div>
        )}

        {state === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white text-sm tracking-widest uppercase">Logged</p>
          </>
        )}

        {state === "error" && (
          <div className="w-full space-y-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={retry}
              className="w-full py-4 rounded-2xl bg-white text-black text-sm font-semibold tracking-widest uppercase"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
