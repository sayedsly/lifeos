"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
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
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key missing");

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // Safari requires Uint8Array specifically
      const key = vapidKey.replace(/-/g, "+").replace(/_/g, "/");
      const padded = key.padEnd(key.length + (4 - key.length % 4) % 4, "=");
      const raw = atob(padded);
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: uint8,
      });

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
      console.error("Subscribe error:", e);
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
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
    } catch (e: any) {
      setError(e.message);
      console.error("Send error:", e);
    }
  };

  return { supported, subscribed, loading, error, subscribe, unsubscribe, sendTestNotification };
}
