// @vitest-environment node
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { localAdmin, SEED, seed } from "../../../../scripts/seed";
import { sendMessage } from "./messages";

vi.mock("server-only", () => ({}));

const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const up =
  !!url &&
  !!anonKey &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!process.env.MESSAGE_ENCRYPTION_KEY &&
  (await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } }).then(
    (r) => r.ok,
    () => false,
  ));

async function signedIn(email: string): Promise<{ sb: SupabaseClient; userId: string }> {
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: SEED.password });
  if (error) throw error;
  return { sb, userId: data.user.id };
}

describe.skipIf(!up)("chat signals", () => {
  let coupleId = "";

  beforeAll(async () => {
    coupleId = (await seed(localAdmin())).coupleId;
  });

  test("b hears the couple topic when a sends; the signal carries the id only", async () => {
    const a = await signedIn(SEED.emails.a);
    const b = await signedIn(SEED.emails.b);

    const payload = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no signal in 10 s")), 10_000);
      b.sb
        .channel(`couple:${coupleId}`, { config: { private: true } })
        .on("broadcast", { event: "message" }, ({ payload }) => {
          clearTimeout(timer);
          resolve(payload);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") reject(err);
          if (status === "SUBSCRIBED")
            void sendMessage({ userId: a.userId, coupleId }, "signal", a.sb);
        });
    });

    expect(Object.keys(payload)).toEqual(["id"]);
  }, 15_000);

  test("a typing broadcast reaches b on the couple topic", async () => {
    const a = await signedIn(SEED.emails.a);
    const b = await signedIn(SEED.emails.b);
    const topic = `couple:${coupleId}`;

    const received = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no typing in 10 s")), 10_000);
      b.sb
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "typing" }, () => {
          clearTimeout(timer);
          resolve();
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") reject(err);
        });
    });

    const sender = a.sb.channel(topic, { config: { private: true } });
    await new Promise<void>((resolve, reject) =>
      sender.subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR") reject(err);
      }),
    );
    await new Promise((r) => setTimeout(r, 1_000));
    await sender.send({ type: "broadcast", event: "typing", payload: {} });

    await received;
  }, 20_000);
});
