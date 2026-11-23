import { remindersResponse, sendReminders } from "@/features/calendar/server/sendReminders";
import { withContract } from "@/shared/http/withContract";

export const GET = withContract({ output: remindersResponse, auth: "cron" }, async () => ({
  sent: await sendReminders(),
}));
