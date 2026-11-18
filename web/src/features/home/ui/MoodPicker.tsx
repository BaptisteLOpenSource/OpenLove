"use client";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { type MoodValue, moodValue } from "@/shared/contracts/home";

// One picker, every entry point (Accueil, banner, chat header) renders this.
export function MoodPicker({
  action,
  mine,
}: {
  action: (form: FormData) => Promise<void>;
  mine: MoodValue | null;
}) {
  const t = useTranslations("home.mood");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-full border px-4 py-2"
      >
        {t("open")}
      </button>
      <dialog ref={dialog} aria-label={t("title")} className="m-auto rounded-xl p-4">
        <form
          action={action}
          onSubmit={() => dialog.current?.close()}
          className="flex flex-wrap justify-center gap-2"
        >
          {moodValue.options.map((m) => (
            <button
              key={m}
              type="submit"
              name="mood"
              value={m}
              aria-pressed={mine === m}
              className="rounded-full border px-3 py-1"
            >
              {t(`values.${m}`)}
            </button>
          ))}
        </form>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="mt-4 rounded-full border px-4 py-2"
        >
          {t("close")}
        </button>
      </dialog>
    </>
  );
}
