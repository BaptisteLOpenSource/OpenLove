"use server";
import { revalidatePath } from "next/cache";

import { setMoodInput } from "@/shared/contracts/home";
import { partnerOf, serverClient } from "@/shared/supabase/server";

import { setMood } from "./getHome";

export async function setMoodAction(form: FormData): Promise<void> {
  const input = setMoodInput.safeParse({ mood: form.get("mood") });
  if (!input.success) return;
  const sb = await serverClient();
  const result = await partnerOf(sb);
  if (!result.ok) return;
  await setMood(sb, result.partner, input.data.mood);
  revalidatePath("/");
}
