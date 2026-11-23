import { getTranslations } from "next-intl/server";

import { notify } from "@/shared/push/notify";
import { adminClient } from "@/shared/supabase/server";

import { dueReminders, type SpecialDate } from "../domain/reminders";

type Row = SpecialDate & { couple_id: string };

// Service role: no user session, so recipients are resolved here from couple_members.
export async function sendReminders(now = new Date()): Promise<number> {
  const sb = adminClient();
  const dates = await sb.from("special_dates").select("id, couple_id, label, date, private_to");
  if (dates.error) throw dates.error;
  const members = await sb.from("couple_members").select("couple_id, user_id");
  if (members.error) throw members.error;

  const t = await getTranslations("reminder");
  let sent = 0;
  for (const r of dueReminders(dates.data as Row[], now)) {
    const { couple_id } = dates.data.find((d) => d.id === r.id) as Row;
    const to = members.data
      .filter((m) => m.couple_id === couple_id && (!r.private_to || m.user_id === r.private_to))
      .map((m) => m.user_id as string);
    const body =
      r.inDays === 0
        ? t("today", { label: r.label })
        : t("inDays", { label: r.label, days: r.inDays });
    for (const userId of to) {
      await notify(userId, { title: t("title"), body, url: "/", tag: `reminder-${r.id}` });
      sent++;
    }
  }
  return sent;
}
