# home

Accueil: the first screen of a Partenaire. Holds the Compteur.

- Language: Compteur (`milestone`) = time elapsed since the Couple's start date, as years, months,
  days and total days. See `CONTEXT.md`.
- Language: Prochaine date (`upcomingDate`) = nearest Dates spéciales (`specialDate`) within 30 days.
  Only Dates spéciales in v1, no calendar events. Feb 29 recurs as Feb 28 in non-leap years.
- Provenance: Partenaire names (`getPartnerNames`), start date and `time_zone` come from the Couple row. "Today" is computed in the
  Couple time zone (`todayIn`) from the SERVER clock, never the client's.
- Invariants: future start date gives all zeros; months are anchored on the start date with the
  day clamped to month end (31 Jan + 1 month = 29 Feb in 2024). Domain uses built-ins only.
- Invariants (Prochaine date): private dates are hidden by RLS on `private_to`, never filtered in
  app code. Nearest date wins; ties broken by label.
- Language: Humeur (`mood`) = one value per Partenaire per day (Couple time zone), from `moodValue`.
  Setting it again the same day replaces it (upsert on `partner_id, day`). Both Partenaires see both.
- Invariant (Humeur): RLS lets a Partenaire write only their own row of their Couple; reads are Couple-wide.
- Humeur history (`moodHistory`): the 6 days before today, newest first, same window for both
  Partenaires, empty days kept as nulls. One picker (`MoodPicker`) for every entry point: Accueil,
  desktop banner, chat header (web and Android).
- Banner: desktop only (mobile gets the Rappel push, #25), shown while no own Humeur today.
  Dismiss hides it 48 h on this device (`localStorage`).
