# calendar

Dates spéciales and their Rappels (`CONTEXT.md`).

- Rappel rule (`dueReminders`): Dates spéciales recur yearly (month/day). Reminded on the day itself
  and 7 days before. Feb 29 recurs as Feb 28 in non-leap years. "Today" = UTC date of the cron run.
- Recipients (`sendReminders`): shared date -> both Partenaires; `private_to` set -> that
  Partenaire only. Reads with the service role (no user), then `notify` per recipient.
- Trigger: no cron shipped. Forks add their own daily call to `GET /api/cron/reminders` with
  `Authorization: Bearer $CRON_SECRET` (`auth: "cron"`), e.g. `crons` in `web/vercel.json`.
  `CRON_SECRET` unset -> route always 401, Rappels off.
