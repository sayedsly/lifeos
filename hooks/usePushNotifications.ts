"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

async function getApplicationServerKey(base64String: string): Promise<ArrayBuffer> {
  // Use crypto.subtle to import the key — most compatible with Safari
  const normalized = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (e) { console.error(e); }
  };

  const subscribe = async () => {
    setLoading(true);
    setError("");
    try {
      // Step 1: Request notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission denied. Please enable in iOS Settings → LifeOS → Notifications.");

      // Step 2: Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Step 3: Unsubscribe any existing subscription
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // Step 4: Convert VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key not configured");
      const applicationServerKey = await getApplicationServerKey(vapidKey);

      // Step 5: Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Step 6: Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
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
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
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
        body: JSON.stringify({
          userId: user.id,
          title: "LifeOS 💪",
          body: "Push notifications are working!",
          url: "/",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { supported, subscribed, loading, error, subscribe, unsubscribe, sendTestNotification };
}
