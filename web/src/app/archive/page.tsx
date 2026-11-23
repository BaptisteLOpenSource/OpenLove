import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { createRevealAction } from "@/features/reveal/server/revealAction";
import { listReveals } from "@/features/reveal/server/reveals";
import { RevealForm } from "@/features/reveal/ui/RevealForm";
import { RevealList } from "@/features/reveal/ui/RevealList";
import { partnerOf, serverClient } from "@/shared/supabase/server";

export default async function ArchivePage() {
  const sb = await serverClient();
  const result = await partnerOf(sb);
  if (!result.ok) redirect("/login");
  const t = await getTranslations("reveal");
  const { items, me } = await listReveals(result.partner.userId, sb);
  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 p-6">
      <h1 className="text-title-medium">{t("title")}</h1>
      <RevealForm action={createRevealAction} />
      <RevealList items={items} me={me} />
    </main>
  );
}
