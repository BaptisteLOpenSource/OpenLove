import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { listMessages } from "@/features/messages/server/messages";
import { Chat } from "@/features/messages/ui/Chat";
import { partnerOf, serverClient } from "@/shared/supabase/server";

export default async function MessagesPage() {
  const sb = await serverClient();
  const result = await partnerOf(sb);
  if (!result.ok) redirect("/login");
  const t = await getTranslations("messages");
  const initial = await listMessages({ limit: 50 }, result.partner.userId, sb);
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-6">
      <h1 className="text-title-medium">{t("title")}</h1>
      <Chat initial={initial} coupleId={result.partner.coupleId} />
    </main>
  );
}
