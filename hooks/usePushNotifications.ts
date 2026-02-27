"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

function base64ToUint8Array(base64String: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '=='.slice(0, (4 - normalized.length % 4) % 4);
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const a = chars.indexOf(padded[i]);
    const b = chars.indexOf(padded[i + 1]);
    const c = chars.indexOf(padded[i + 2]);
    const d = chars.indexOf(padded[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (padded[i + 2] !== '=') bytes.push(((b & 15) << 4) | (c >> 2));
    if (padded[i + 3] !== '=') bytes.push(((c & 3) << 6) | d);
  }
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  bytes.forEach((b, i) => { view[i] = b; });
  return buffer;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ok = typeof window !== "undefined"
      && "serviceWorker" in navigator
      && "PushManager" in window;
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
      if (!vapidKey) throw new Error("VAPID public key missing from environment");

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const applicationServerKey = base64ToUint8Array(vapidKey);

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
      console.error("Send error:", e);
    }
  };

  return { supported, subscribed, loading, error, subscribe, unsubscribe, sendTestNotification };
}
