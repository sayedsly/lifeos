"use client";
import { useState, useRef } from "react";
import { parseIntent } from "@/lib/voice/parser";
import { runAgent, AgentResult } from "@/lib/agent";
import { executeIntent } from "@/lib/voice/router";
import type { ParsedIntent } from "@/types";

export type VoiceState = "idle" | "recording" | "processing" | "confirming" | "success" | "error" | "text_input";

function isQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  return /^(how|what|should|can|do|did|is|are|will|why|when|which|who|give me|make me|create|suggest|recommend|tell me|help me|split|analyze|calculate|plan)/.test(t)
    || t.includes("?")
    || t.includes("should i")
    || t.includes("left")
    || t.includes("remaining")
    || t.includes("today")
    || t.includes("calories")
    || t.includes("macro")
    || t.includes("workout")
    || t.includes("snack")
    || t.includes("split")
    || t.includes("goal");
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState("");
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const gotResultRef = useRef(false);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const processText = async (text: string) => {
    setState("processing");
    try {
      // Try local parser first for simple logs
      const parsed = parseIntent(text);
      if (parsed && !isQuestion(text)) {
        setIntent(parsed);
        setState("confirming");
        return;
      }
      // Route to AI agent
      setIntent(null);
      const result = await runAgent(text);
      setAgentResult(result);
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
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setState("idle"); setIntent(null); setTranscript(""); setError(""); setAgentResult(null);
  };

  const submitText = (text: string) => { gotResultRef.current = true; setTranscript(text); processText(text); };
  const stop = () => recognitionRef.current?.stop();

  return { state, intent, setIntent, error, transcript, speechSupported, start, stop, confirm, cancel, submitText, agentResult, setAgentResult };
}
