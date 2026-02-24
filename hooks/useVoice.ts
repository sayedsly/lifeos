"use client";
import { useState, useCallback, useRef } from "react";
import { parseIntent } from "@/lib/voice/parser";
import { executeIntent } from "@/lib/voice/router";
import type { ParsedIntent } from "@/types";

export type VoiceState = "idle" | "recording" | "processing" | "confirming" | "success" | "error";

let activeRecognition: SpeechRecognition | null = null;

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [pendingIntent, setPendingIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState("");

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice not supported in this browser. Use Chrome.");
      setState("error");
      return;
    }

    if (activeRecognition) {
      activeRecognition.abort();
      activeRecognition = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    activeRecognition = recognition;

    recognition.onstart = () => {
      setState("recording");
    };

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setState("processing");
      const intent = parseIntent(text);
      setPendingIntent(intent);
      setState("confirming");
      activeRecognition = null;
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else if (e.error === "aborted") {
        // manual stop, do nothing
        return;
      } else {
        setError(`Error: ${e.error}`);
      }
      setState("error");
      activeRecognition = null;
    };

    recognition.onend = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
    };

    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    if (activeRecognition) {
      activeRecognition.stop();
      activeRecognition = null;
    }
  }, []);

  const confirmIntent = useCallback(async () => {
    if (!pendingIntent) return;
    await executeIntent(pendingIntent);
    setState("success");
  }, [pendingIntent]);

  const reset = useCallback(() => {
    if (activeRecognition) {
      activeRecognition.abort();
      activeRecognition = null;
    }
    setState("idle");
    setTranscript("");
    setPendingIntent(null);
    setError("");
  }, []);

  return {
    state,
    transcript,
    pendingIntent,
    error,
    startRecording,
    stopRecording,
    confirmIntent,
    reset,
  };
}
