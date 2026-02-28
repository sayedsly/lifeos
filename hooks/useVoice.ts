"use client";
import { useState, useRef } from "react";
import { parseIntent } from "@/lib/voice/parser";
import { executeIntent } from "@/lib/voice/router";
import type { ParsedIntent } from "@/types";

export type VoiceState = "idle" | "recording" | "processing" | "confirming" | "success" | "error" | "text_input";

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const gotResultRef = useRef(false);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const processText = async (text: string) => {
    setState("processing");
    try {
      const parsed = parseIntent(text);
      if (!parsed) { setError(`Couldn't understand: "${text}"`); setState("error"); return; }
      setIntent(parsed);
      setState("confirming");
    } catch (e: any) { setError(e.message); setState("error"); }
  };

  const start = () => {
    if (!speechSupported) { setState("text_input"); return; }
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      gotResultRef.current = false;

      recognition.onstart = () => setState("recording");
      recognition.onresult = (event: any) => {
        gotResultRef.current = true;
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processText(text);
      };
      recognition.onerror = (event: any) => {
        if (gotResultRef.current) return;
        if (event.error === "not-allowed") { setError("Microphone permission denied."); setState("error"); }
        else setState("text_input");
      };
      recognition.onend = () => { if (!gotResultRef.current) setState("text_input"); };
      recognition.start();
    } catch (e) { setState("text_input"); }
  };

  const confirm = async (overrideIntent?: ParsedIntent) => {
    const target = overrideIntent || intent;
    if (!target) return;
    setState("processing");
    try {
      await executeIntent(target);
      setState("success");
      setTimeout(() => { setState("idle"); setIntent(null); setTranscript(""); gotResultRef.current = false; }, 1500);
    } catch (e: any) { setError(e.message); setState("error"); }
  };

  const cancel = () => {
    recognitionRef.current?.abort();
    gotResultRef.current = false;
    setState("idle"); setIntent(null); setTranscript(""); setError("");
  };

  const submitText = (text: string) => { gotResultRef.current = true; setTranscript(text); processText(text); };
  const stop = () => recognitionRef.current?.stop();

  return { state, intent, setIntent, error, transcript, speechSupported, start, stop, confirm, cancel, submitText };
}
