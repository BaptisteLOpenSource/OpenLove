// @vitest-environment node
import { createTranslator } from "next-intl";
import { beforeEach, expect, test, vi } from "vitest";

import fr from "@/shared/i18n/messages/fr.json";

import { sendMessage } from "./messages";

vi.mock("server-only", () => ({}));
const afterTasks: Promise<unknown>[] = [];
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => afterTasks.push(Promise.resolve(cb())),
}));
vi.mock("@/shared/env", () => ({
  env: () => ({ MESSAGE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "messages.push") =>
    createTranslator({ locale: "fr", messages: fr, namespace }),
}));

const notify = vi.fn();
vi.mock("@/shared/push/notify", () => ({ notify: (...a: unknown[]) => notify(...a) }));

let members: { user_id: string }[] = [];
let lookupError: unknown = null;
const lookup = { couple: "", not: "" };
vi.mock("@/shared/supabase/server", () => ({
  adminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, couple: string) => ({
          neq: async (_u: string, me: string) => {
            Object.assign(lookup, { couple, not: me });
            return { data: lookupError ? null : members, error: lookupError };
          },
        }),
      }),
    }),
  }),
}));

const sb = {
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: { id: 7, author_id: "me", body_enc: "x", created_at: "2026-11-23T10:00:00Z" },
          error: null,
        }),
      }),
    }),
  }),
};
const SECRET = "mot de passe: hunter2";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  members = [{ user_id: "other" }];
  lookupError = null;
});

// toMessage decrypts the stub row: bypass it, the push path is what is under test
vi.mock("@/shared/crypto", () => ({ encrypt: () => "enc", decrypt: () => SECRET }));

test("notifies the other Partenaire with a generic payload, never the text", async () => {
  await sendMessage({ userId: "me", coupleId: "c1" }, SECRET, sb as never);
  await Promise.all(afterTasks);
  expect(lookup).toEqual({ couple: "c1", not: "me" });
  expect(notify).toHaveBeenCalledOnce();
  const [recipient, payload] = notify.mock.calls[0] as [string, Record<string, string>];
  expect(recipient).toBe("other");
  expect(payload).toEqual({
    title: fr.messages.push.title,
    body: fr.messages.push.body,
    url: "/messages",
    tag: "chat",
  });
  expect(JSON.stringify(notify.mock.calls)).not.toContain("hunter2");
});

test("push failure never fails the send", async () => {
  notify.mockRejectedValue(new Error("fcm down"));
  await expect(
    sendMessage({ userId: "me", coupleId: "c1" }, SECRET, sb as never),
  ).resolves.toMatchObject({
    id: "7",
  });
  await Promise.all(afterTasks);
  lookupError = new Error("db");
  await expect(
    sendMessage({ userId: "me", coupleId: "c1" }, SECRET, sb as never),
  ).resolves.toMatchObject({
    id: "7",
  });
  await Promise.all(afterTasks);
});
