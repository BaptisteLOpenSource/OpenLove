"use client";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { REVEAL_KINDS, type RevealState } from "@/shared/contracts/reveals";

export function RevealForm({
  action,
}: {
  action: (prev: RevealState, form: FormData) => Promise<RevealState>;
}) {
  const t = useTranslations("reveal");
  const [state, formAction, pending] = useActionState((prev: RevealState, form: FormData) => {
    const at = new Date(form.get("revealAt") as string);
    form.set("revealAt", Number.isNaN(at.getTime()) ? "" : at.toISOString());
    return action(prev, form);
  }, {});
  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <fieldset className="flex gap-4">
        <legend>{t("form.kind")}</legend>
        {REVEAL_KINDS.map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input type="radio" name="kind" value={k} defaultChecked={k === "letter"} />
            {t(`kind.${k}`)}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        {t("form.title")}
        <input name="title" maxLength={120} required className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1">
        {t("form.body")}
        <textarea name="body" maxLength={10000} required rows={5} className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1">
        {t("form.revealAt")}
        <input name="revealAt" type="datetime-local" required className="rounded border p-2" />
      </label>
      {state.error && <p role="alert">{t(`form.error.${state.error}`)}</p>}
      {state.ok && <output>{t("form.sent")}</output>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary p-2 text-on-primary"
      >
        {t("form.submit")}
      </button>
    </form>
  );
}
