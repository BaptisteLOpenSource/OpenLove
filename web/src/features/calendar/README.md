# calendar

Dates spéciales and their Rappels (`CONTEXT.md`).

- Rappel rule (`dueReminders`): Dates spéciales recur yearly (month/day). Reminded on the day itself
  and 7 days before. Feb 29 recurs as Feb 28 in non-leap years. "Today" = UTC date of the cron run.
- Recipients (`sendReminders`): shared date -> both Partenaires; `private_to` set -> that
  Partenaire only. Reads with the service role (no user), then `notify` per recipient.
- Trigger: Vercel cron (`web/vercel.json`, daily 08:00 UTC) calls `GET /api/cron/reminders` with
  `Authorization: Bearer $CRON_SECRET` (`auth: "cron"`). Set the Vercel project root to `web/`.
- Self-hosting without Vercel: call that route daily with the same header.
