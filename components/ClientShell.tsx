"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import AuthProvider from "@/components/AuthProvider";
import BottomNav from "@/components/nav/BottomNav";
import MicButton from "@/components/nav/MicButton";
import VoiceOverlay from "@/components/voice/VoiceOverlay";
import { useAuthStore } from "@/store/useAuthStore";

function Shell() {
  const { user, loading } = useAuthStore();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/auth" && !redirected.current) {
      redirected.current = true;
      window.location.replace("/auth");
    }
  }, [user, loading, pathname]);

  if (loading || !user) return null;

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
