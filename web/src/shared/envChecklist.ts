import type { z } from "zod";

type EnvStatus = "ok" | "optional" | "missing" | "invalid";
export type EnvCheckItem = { key: string; status: EnvStatus; docUrl?: string };

export function checkEnv(
  schema: z.ZodObject,
  source: Record<string, string | undefined>,
  allOrNothing: readonly string[] = [],
): EnvCheckItem[] {
  const partial = allOrNothing.some((k) => source[k]) && !allOrNothing.every((k) => source[k]);
  return Object.entries(schema.shape).map(([key, field]) => {
    const docUrl = field.meta()?.docUrl;
    const value = source[key];
    if (value === undefined || value === "") {
      const optional = field.safeParse(undefined).success;
      const status = optional && !(partial && allOrNothing.includes(key)) ? "optional" : "missing";
      return { key, status, docUrl };
    }
    return { key, status: field.safeParse(value).success ? "ok" : "invalid", docUrl };
  });
}
