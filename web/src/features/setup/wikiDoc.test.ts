import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

import { envSchema } from "@/shared/env";

const wiki = readFileSync(
  join(import.meta.dirname, "../../../../site/src/content/docs/wiki/installer/index.mdx"),
  "utf8",
).replaceAll("\r\n", "\n");

test("every env key has its wiki heading and a docUrl pointing at it", () => {
  for (const [key, field] of Object.entries(envSchema.shape)) {
    expect(wiki).toContain(`\n## ${key}\n`);
    expect(field.meta()?.docUrl).toMatch(new RegExp(`/wiki/installer/#${key.toLowerCase()}$`));
  }
});

test("wiki keeps the vercel root toggle and the hosted security checklist", () => {
  expect(wiki).toContain("Include files outside the root directory");
  expect(wiki).toContain("## 5. Checklist de sécurité hébergée");
});
