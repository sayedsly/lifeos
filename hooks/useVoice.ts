"use client";
import { useState, useRef, useCallback } from "react";
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

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!speechSupported) {
      setState("text_input");
      return;
    }
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => setState("recording");
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processText(text);
      };
      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setError("Microphone permission denied.");
        } else {
          setState("text_input");
        }
      };
      recognition.onend = () => {
        if (state === "recording") setState("text_input");
      };
      recognition.start();
    } catch (e) {
      setState("text_input");
    }
  }, [speechSupported, state]);

  const processText = async (text: string) => {
    setState("processing");
    try {
      const parsed = parseIntent(text);
      if (!parsed) {
        setError(`Couldn't understand: "${text}"`);
        setState("error");
        return;
      }
      setIntent(parsed);
      setState("confirming");
    } catch (e: any) {
      setError(e.message);
      setState("error");
    }
  };

  const confirm = async () => {
    if (!intent) return;
    setState("processing");
    try {
      await executeIntent(intent);
      setState("success");
      setTimeout(() => { setState("idle"); setIntent(null); setTranscript(""); }, 1500);
    } catch (e: any) {
      setError(e.message);
      setState("error");
    }
  };

  const cancel = () => {
    recognitionRef.current?.abort();
    setState("idle");
    setIntent(null);
    setTranscript("");
    setError("");
  };

  const submitText = (text: string) => {
    setTranscript(text);
    processText(text);
  };

  const stop = () => recognitionRef.current?.stop();

  return { state, intent, error, transcript, speechSupported, start, stop, confirm, cancel, submitText };
}
