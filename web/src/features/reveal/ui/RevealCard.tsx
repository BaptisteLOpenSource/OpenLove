import { useFormatter, useTranslations } from "next-intl";

import type { Reveal } from "@/shared/contracts/reveals";

export function RevealCard({ item, me }: { item: Reveal; me: string }) {
  const t = useTranslations("reveal");
  const format = useFormatter();
  const date = format.dateTime(new Date(item.revealAt), {
    dateStyle: "long",
    timeStyle: "short",
  });
  const mine = item.authorId === me;
  const hidden = item.title === null || item.body === null;
  return (
    <article className="flex w-full flex-col gap-1 rounded-xl border p-4">
      <p className="text-label-medium">{t(`kind.${item.kind}`)}</p>
      {hidden ? (
        <p className="text-body-large">{t(`locked.${item.kind}`, { date })}</p>
      ) : (
        <>
          <h2 className="text-title-medium">{item.title}</h2>
          <p className="text-body-large whitespace-pre-wrap">{item.body}</p>
          <p className="text-body-medium">
            {item.locked && mine ? t("scheduled", { date }) : date}
          </p>
        </>
      )}
    </article>
  );
}
