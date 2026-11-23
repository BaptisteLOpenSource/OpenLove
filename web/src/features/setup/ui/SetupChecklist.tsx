import { useTranslations } from "next-intl";

import { groupByStep } from "@/features/setup/steps";
import { INSTALL_GUIDE_URL } from "@/shared/env";
import type { EnvCheckItem } from "@/shared/envChecklist";

export function SetupChecklist({ items }: { items: EnvCheckItem[] }) {
  const t = useTranslations("setup");
  return (
    <div className="flex flex-col gap-8">
      {groupByStep(items).map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <h2 className="text-title-large">{t(`steps.${group.id}.title`)}</h2>
          {group.items.length > 0 && (
            <ul className="flex flex-col gap-3">
              {group.items.map(({ key, status, docUrl }) => (
                <li key={key} className="flex flex-col gap-1">
                  <p>
                    <code>{key}</code> <span>{t(`status.${status}`)}</span>
                  </p>
                  <p className="text-body-medium">
                    {t.has(`vars.${key}`) ? t(`vars.${key}`) : t("genericHowTo")}
                  </p>
                  {docUrl && (
                    <a href={docUrl} target="_blank" rel="noopener noreferrer">
                      {t("guide")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <a href={INSTALL_GUIDE_URL} target="_blank" rel="noopener noreferrer">
        {t("fullGuide")}
      </a>
    </div>
  );
}
