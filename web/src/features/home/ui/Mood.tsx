import { useTranslations } from "next-intl";

import { type MoodValue, moodValue } from "@/shared/contracts/home";

import type { Mood as MoodState } from "../domain/mood";

export function Mood({
  value,
  action,
}: {
  value: MoodState;
  action: (form: FormData) => Promise<void>;
}) {
  const t = useTranslations("home.mood");
  const label = (m: MoodValue | null) => (m ? t(`values.${m}`) : t("none"));
  return (
    <section className="flex flex-col items-center gap-2">
      <h2 className="text-title-medium">{t("title")}</h2>
      <p className="text-body-large">{t("mineLine", { value: label(value.mine) })}</p>
      <p className="text-body-large">{t("partnerLine", { value: label(value.partner) })}</p>
      <form action={action} className="flex flex-wrap justify-center gap-2">
        {moodValue.options.map((m) => (
          <button
            key={m}
            type="submit"
            name="mood"
            value={m}
            aria-pressed={value.mine === m}
            className="rounded-full border px-3 py-1"
          >
            {t(`values.${m}`)}
          </button>
        ))}
      </form>
    </section>
  );
}
