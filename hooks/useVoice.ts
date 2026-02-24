"use client";
import { useState, useRef, useCallback } from "react";
import { parseIntent } from "@/lib/voice/parser";
import { executeIntent } from "@/lib/voice/router";
import type { ParsedIntent } from "@/types";

export type VoiceState = "idle" | "recording" | "processing" | "confirming" | "success" | "error";

let activeRecognition: any = null;

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState("");

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech not supported in this browser."); setState("error"); return; }

    if (activeRecognition) { activeRecognition.stop(); activeRecognition = null; }

    const recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setState("recording");
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setState("processing");
      const parsed = parseIntent(text);
      setIntent(parsed);
      if (parsed.domain === "unknown") { setState("error"); setError("Couldn't understand that."); }
      else setState("confirming");
    };
    recognition.onerror = (e: any) => { setError(e.error); setState("error"); };
    recognition.onend = () => { activeRecognition = null; };
    recognition.start();
  }, []);

  const confirm = useCallback(async () => {
    if (!intent) return;
    setState("processing");
    try {
      await executeIntent(intent);
      setState("success");
      setTimeout(() => { setState("idle"); setIntent(null); setTranscript(""); }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to save.");
      setState("error");
    }
  }, [intent]);

  const cancel = useCallback(() => {
    if (activeRecognition) { activeRecognition.stop(); activeRecognition = null; }
    setState("idle"); setIntent(null); setTranscript(""); setError("");
  }, []);

  return { state, transcript, intent, error, start, confirm, cancel };
}
