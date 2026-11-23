import { getTranslations } from "next-intl/server";

import { redeemInvite } from "@/features/couple/server/invite";
import { InviteForm } from "@/features/couple/ui/InviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("invite");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-headline-large">{t("title")}</h1>
      <InviteForm action={redeemInvite.bind(null, token)} />
    </main>
  );
}
