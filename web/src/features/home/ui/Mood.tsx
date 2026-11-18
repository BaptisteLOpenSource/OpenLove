import { useFormatter, useTranslations } from "next-intl";

import type { MoodValue } from "@/shared/contracts/home";

import type { Mood as MoodState, MoodDay } from "../domain/mood";
import { MoodPicker } from "./MoodPicker";

export function Mood({
  value,
  history,
  action,
}: {
  value: MoodState;
  history: MoodDay[];
  action: (form: FormData) => Promise<void>;
}) {
  const t = useTranslations("home.mood");
  const format = useFormatter();
  const label = (m: MoodValue | null, none: string) => (m ? t(`values.${m}`) : none);
  return (
    <section className="flex flex-col items-center gap-2">
      <h2 className="text-title-medium">{t("title")}</h2>
      <p className="text-body-large">{t("mineLine", { value: label(value.mine, t("none")) })}</p>
      <p className="text-body-large">
        {t("partnerLine", { value: label(value.partner, t("none")) })}
      </p>
      <MoodPicker action={action} mine={value.mine} />
      <h3 className="text-title-small">{t("historyTitle")}</h3>
      <ul className="text-body-medium">
        {history.map((d) => (
          <li key={d.day}>
            {t("historyLine", {
              day: format.dateTime(new Date(`${d.day}T00:00:00Z`), {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              }),
              mine: label(d.mine, t("historyNone")),
              partner: label(d.partner, t("historyNone")),
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
