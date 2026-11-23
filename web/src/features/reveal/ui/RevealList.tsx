import { useTranslations } from "next-intl";

import type { Reveal } from "@/shared/contracts/reveals";

import { RevealCard } from "./RevealCard";

export function RevealList({ items, me }: { items: Reveal[]; me: string }) {
  const t = useTranslations("reveal");
  if (items.length === 0) return <p>{t("empty")}</p>;
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {items.map((i) => (
        <RevealCard key={i.id} item={i} me={me} />
      ))}
    </div>
  );
}
