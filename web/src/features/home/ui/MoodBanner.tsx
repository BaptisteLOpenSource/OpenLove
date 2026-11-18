"use client";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { MoodPicker } from "./MoodPicker";

const KEY = "openlove.moodBanner.dismissedAt";
const HIDE_MS = 48 * 3_600_000;

export function isDismissed(dismissedAt: string | null, now: number): boolean {
  const at = Number(dismissedAt);
  return at > 0 && now - at < HIDE_MS;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

function dismissed(): boolean {
  try {
    return isDismissed(localStorage.getItem(KEY), Date.now());
  } catch {
    return false;
  }
}

// Desktop only: mobile gets the Rappel push (#25). Dismiss is per device.
export function MoodBanner({ action }: { action: (form: FormData) => Promise<void> }) {
  const t = useTranslations("home.mood");
  // Server render has no localStorage: hidden until the client reads it.
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  if (hidden || dismissedNow) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    setDismissedNow(true);
  };
  return (
    <aside className="hidden w-full max-w-xl items-center justify-between gap-4 rounded-xl border p-4 md:flex">
      <p className="text-body-large">{t("banner")}</p>
      <MoodPicker action={action} mine={null} />
      <button type="button" onClick={dismiss} className="rounded-full border px-4 py-2">
        {t("dismiss")}
      </button>
    </aside>
  );
}
