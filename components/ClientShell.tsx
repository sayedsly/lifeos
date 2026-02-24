"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AuthProvider from "@/components/AuthProvider";
import BottomNav from "@/components/nav/BottomNav";
import MicButton from "@/components/nav/MicButton";
import VoiceOverlay from "@/components/voice/VoiceOverlay";
import { useAuthStore } from "@/store/useAuthStore";

function Shell() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/auth") {
      router.replace("/auth");
    }
    if (!loading && user && pathname === "/auth") {
      router.replace("/");
    }
  }, [user, loading, pathname]);

  if (loading) return null;
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
