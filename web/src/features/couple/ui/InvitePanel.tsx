"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

type Result = { url: string } | { error: "refused" };

export function InvitePanel({ action }: { action: () => Promise<Result> }) {
  const t = useTranslations("settings.invite");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const create = () => startTransition(async () => setResult(await action()));
  return (
    <section className="flex w-full max-w-sm flex-col gap-4">
      <h2 className="text-title-large">{t("title")}</h2>
      <p>{t("intro")}</p>
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="rounded-full bg-primary p-2 text-on-primary"
      >
        {t("create")}
      </button>
      {result && "error" in result && <p role="alert">{t("refused")}</p>}
      {result && "url" in result && (
        <input
          readOnly
          value={result.url}
          aria-label={t("linkLabel")}
          className="rounded border p-2"
        />
      )}
    </section>
  );
}
