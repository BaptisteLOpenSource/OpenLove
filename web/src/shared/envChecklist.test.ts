import { expect, test } from "vitest";
import { z } from "zod";

import { envSchema, FIREBASE_KEYS } from "./env";
import { checkEnv } from "./envChecklist";

const schema = z.object({ URL: z.url(), TOKEN: z.string().min(1) });

test("valid values are ok", () => {
  expect(checkEnv(schema, { URL: "https://a.io", TOKEN: "x" })).toEqual([
    { key: "URL", status: "ok" },
    { key: "TOKEN", status: "ok" },
  ]);
});

test("undefined and empty string are missing", () => {
  expect(checkEnv(schema, {}).map((i) => i.status)).toEqual(["missing", "missing"]);
  expect(checkEnv(schema, { URL: "https://a.io", TOKEN: "" })[1]).toEqual({
    key: "TOKEN",
    status: "missing",
  });
});

test("an absent optional var is optional", () => {
  const result = checkEnv(z.object({ OPT: z.string().optional() }), {});
  expect(result).toEqual([{ key: "OPT", status: "optional" }]);
});

test("present but failing the schema is invalid", () => {
  expect(checkEnv(schema, { URL: "nope", TOKEN: "x" })).toEqual([
    { key: "URL", status: "invalid" },
    { key: "TOKEN", status: "ok" },
  ]);
});

test("a var added to the schema appears with no other edit", () => {
  const result = checkEnv(schema.extend({ EXTRA: z.string() }), {
    URL: "https://a.io",
    TOKEN: "x",
  });
  expect(result).toContainEqual({ key: "EXTRA", status: "missing" });
  expect(result).toHaveLength(3);
});

test("the real schema on empty env: Firebase and cron optional, the rest missing", () => {
  const result = checkEnv(envSchema, {});
  const optional = [...FIREBASE_KEYS, "CRON_SECRET"];
  expect(result).toHaveLength(Object.keys(envSchema.shape).length);
  for (const i of result) {
    expect(i.status).toBe(optional.includes(i.key) ? "optional" : "missing");
  }
});

test("partial all-or-nothing group: unset members are missing", () => {
  const result = checkEnv(envSchema, { NEXT_PUBLIC_FIREBASE_API_KEY: "k" }, FIREBASE_KEYS);
  const status = (k: string) => result.find((i) => i.key === k)?.status;
  expect(status("NEXT_PUBLIC_FIREBASE_API_KEY")).toBe("ok");
  expect(status("FIREBASE_ANDROID_APP_ID")).toBe("missing");
});

test("docUrl comes from the schema meta", () => {
  const documented = z.object({ URL: z.url().meta({ docUrl: "https://d.io/x" }) });
  expect(checkEnv(documented, {})).toEqual([
    { key: "URL", status: "missing", docUrl: "https://d.io/x" },
  ]);
});

test("never leaks provided values", () => {
  const out = JSON.stringify(checkEnv(schema, { URL: "supersecret-bad", TOKEN: "supersecret-ok" }));
  expect(out).not.toContain("supersecret");
});
