import { z } from "zod";

declare module "zod" {
  interface GlobalMeta {
    docUrl?: string;
  }
}

// Wiki and presentation page: GitHub Pages on the author's domain (site/).
const WIKI_URL = "https://openlove.baptisteledev.fr/wiki";
const guide = (anchor: string) => `${WIKI_URL}/installer/#${anchor}`;

export const envSchema = z.object({
  SUPABASE_URL: z.url().meta({ docUrl: guide("supabase_url") }),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .meta({ docUrl: guide("supabase_anon_key") }),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .meta({ docUrl: guide("supabase_service_role_key") }),
  NEXT_PUBLIC_SUPABASE_URL: z.url().meta({ docUrl: guide("next_public_supabase_url") }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .meta({ docUrl: guide("next_public_supabase_anon_key") }),
  MESSAGE_ENCRYPTION_KEY: z
    .base64()
    .refine((v) => Buffer.from(v, "base64").length === 32)
    .meta({ docUrl: guide("message_encryption_key") }),
});

export const publicEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

let cached: z.infer<typeof envSchema> | undefined;

// Lazy: build and tests run without .env.
export function env() {
  return (cached ??= envSchema.parse(process.env));
}
