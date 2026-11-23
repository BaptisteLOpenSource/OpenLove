import { expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/features/calendar/server/sendReminders", () => ({ sendReminders: async () => 2 }));
vi.mock("@/shared/supabase/server", () => ({ serverClient: vi.fn(), partnerOf: vi.fn() }));

test("cron GET with the secret -> { sent }, without -> 401", async () => {
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_ANON_KEY", "a");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "b");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a");
  vi.stubEnv("MESSAGE_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
  vi.stubEnv("SETUP_TOKEN", "x".repeat(32));
  vi.stubEnv("CRON_SECRET", "s3cret-s3cret-s3cret");
  const call = (h?: string) =>
    GET(new Request("http://x/api/cron/reminders", { headers: h ? { Authorization: h } : {} }));

  expect((await call()).status).toBe(401);
  const ok = await call("Bearer s3cret-s3cret-s3cret");
  expect(await ok.json()).toEqual({ data: { sent: 2 } });
});
