"use client";
import AuthProvider from "@/components/AuthProvider";
import BottomNav from "@/components/nav/BottomNav";
import MicButton from "@/components/nav/MicButton";
import VoiceOverlay from "@/components/voice/VoiceOverlay";
import { useAuthStore } from "@/store/useAuthStore";

function Shell() {
  const { user } = useAuthStore();
  if (!user) return null;
  return (
    <>
      <VoiceOverlay />
      <MicButton />
      <BottomNav />
    </>
  );
}

export default function ClientShell() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
