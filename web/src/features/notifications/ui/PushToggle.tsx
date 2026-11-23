"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { type EnableResult, enablePush } from "./enablePush";

export function PushToggle() {
  const t = useTranslations("settings.push");
  const [result, setResult] = useState<EnableResult | null>(null);
  const [pending, startTransition] = useTransition();
  const enable = () => startTransition(async () => setResult(await enablePush()));
  return (
    <section className="flex w-full max-w-sm flex-col gap-4">
      <h2 className="text-title-large">{t("title")}</h2>
      <p>{t("intro")}</p>
      <button
        type="button"
        onClick={enable}
        disabled={pending || result === "enabled"}
        className="rounded-full bg-primary p-2 text-on-primary"
      >
        {t("enable")}
      </button>
      {result && <p role={result === "enabled" ? "status" : "alert"}>{t(`result.${result}`)}</p>}
    </section>
  );
}
