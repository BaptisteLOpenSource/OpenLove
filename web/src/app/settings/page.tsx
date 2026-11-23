import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { createInvite } from "@/features/couple/server/invite";
import { showPairing } from "@/features/couple/server/showPairing";
import { InvitePanel } from "@/features/couple/ui/InvitePanel";
import { PairingPanel } from "@/features/couple/ui/PairingPanel";
import { partnerOf, serverClient } from "@/shared/supabase/server";

export default async function SettingsPage() {
  const sb = await serverClient();
  const result = await partnerOf(sb);
  if (!result.ok) redirect("/login");
  const { count } = await sb
    .from("couple_members")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "partner_b");
  const canInvite = result.partner.role === "partner_a" && !count;
  const t = await getTranslations("settings");
  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 p-6">
      <h1 className="text-headline-large">{t("title")}</h1>
      <PairingPanel action={showPairing} />
      {canInvite && <InvitePanel action={createInvite} />}
    </main>
  );
}
