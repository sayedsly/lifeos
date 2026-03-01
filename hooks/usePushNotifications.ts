"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (ok) checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (e) { console.error(e); }
  };

  const subscribe = async () => {
    setLoading(true);
    setError("");
    try {
      // Must request permission first
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Please enable notifications in Settings → LifeOS → Notifications");
      }

      // Register SW
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Clear old subscription
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // CRITICAL: Safari requires Uint8Array not ArrayBuffer
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const applicationServerKey = urlBase64ToUint8Array(vapidKey) as unknown as BufferSource;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save subscription");
      }

      setSubscribed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: "LifeOS 💪", body: "Push notifications are working!", url: "/" }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to send");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { supported, subscribed, loading, error, subscribe, unsubscribe, sendTestNotification };
}
