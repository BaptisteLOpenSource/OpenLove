import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

import { publicEnvSchema } from "@/shared/env";

export type EnableResult = "enabled" | "denied" | "unsupported" | "error";

const supported = () => "Notification" in window && "serviceWorker" in navigator;

export async function enablePush(): Promise<EnableResult> {
  if (!supported()) return "unsupported";
  try {
    if ((await Notification.requestPermission()) !== "granted") return "denied";
    // Literal accesses: Next inlines NEXT_PUBLIC_* only when written out.
    const e = publicEnvSchema
      .pick({
        NEXT_PUBLIC_FIREBASE_API_KEY: true,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: true,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: true,
        NEXT_PUBLIC_FIREBASE_APP_ID: true,
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: true,
      })
      .parse({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
    const app = initializeApp({
      apiKey: e.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: e.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: e.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: e.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
    const token = await getToken(getMessaging(app), {
      vapidKey: e.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      ),
    });
    const res = await fetch("/api/push-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: "web" }),
    });
    return res.ok ? "enabled" : "error";
  } catch {
    return "error";
  }
}
