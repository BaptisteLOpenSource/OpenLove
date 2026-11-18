import type { SupabaseClient } from "@supabase/supabase-js";

import type { MoodValue } from "@/shared/contracts/home";

import { type Milestone, milestone, todayIn } from "../domain/milestone";
import { type Mood, moodOf } from "../domain/mood";
import { type UpcomingDate, upcomingDate } from "../domain/upcomingDate";

export type Home = { milestone: Milestone; upcomingDate: UpcomingDate | null; mood: Mood };

// RLS hides other partner's private dates, not filtered here.
export async function getHome(
  sb: SupabaseClient,
  coupleId: string,
  userId: string,
  now = new Date(),
): Promise<Home> {
  const couple = await sb
    .from("couples")
    .select("start_date, time_zone")
    .eq("id", coupleId)
    .single();
  if (couple.error) throw couple.error;
  const dates = await sb.from("special_dates").select("label, date").eq("couple_id", coupleId);
  if (dates.error) throw dates.error;
  const today = todayIn(couple.data.time_zone, now);
  const moods = await sb
    .from("moods")
    .select("partner_id, mood")
    .eq("couple_id", coupleId)
    .eq("day", today);
  if (moods.error) throw moods.error;
  return {
    milestone: milestone(couple.data.start_date, today),
    upcomingDate: upcomingDate(dates.data, today),
    mood: moodOf(moods.data, userId),
  };
}

// Writes the Humeur of today; upsert on (partner_id, day) replaces the earlier one.
export async function setMood(
  sb: SupabaseClient,
  partner: { userId: string; coupleId: string },
  mood: MoodValue,
  now = new Date(),
): Promise<Home> {
  const couple = await sb.from("couples").select("time_zone").eq("id", partner.coupleId).single();
  if (couple.error) throw couple.error;
  const { error } = await sb.from("moods").upsert(
    {
      couple_id: partner.coupleId,
      partner_id: partner.userId,
      day: todayIn(couple.data.time_zone, now),
      mood,
    },
    { onConflict: "partner_id,day" },
  );
  if (error) throw error;
  return getHome(sb, partner.coupleId, partner.userId, now);
}

export async function getPartnerNames(
  sb: SupabaseClient,
  coupleId: string,
): Promise<{ a: string; b: string }> {
  const { data, error } = await sb
    .from("couples")
    .select("partner_a_name, partner_b_name")
    .eq("id", coupleId)
    .single();
  if (error) throw error;
  return { a: data.partner_a_name, b: data.partner_b_name };
}
