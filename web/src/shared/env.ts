import { z } from "zod";

declare module "zod" {
  interface GlobalMeta {
    docUrl?: string;
  }
}

// Wiki and presentation page: GitHub Pages on the author's domain (site/).
const WIKI_URL = "https://openlove.baptisteledev.fr/wiki";
const guide = (anchor: string) => `${WIKI_URL}/installer/#${anchor}`;

const serviceAccount = z.base64().refine((v) => {
  try {
    const j = JSON.parse(Buffer.from(v, "base64").toString("utf8"));
    return ["project_id", "client_email", "private_key"].every(
      (k) => typeof j?.[k] === "string" && j[k],
    );
  } catch {
    return false;
  }
});
const firebaseKey = (anchor: string) =>
  z
    .string()
    .min(1)
    .meta({ docUrl: guide(anchor) });

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
  SETUP_TOKEN: z
    .string()
    .min(32)
    .meta({ docUrl: guide("setup_token") }),
  FIREBASE_SERVICE_ACCOUNT: serviceAccount.meta({ docUrl: guide("firebase_service_account") }),
  FIREBASE_ANDROID_APP_ID: firebaseKey("firebase_android_app_id"),
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseKey("next_public_firebase_api_key"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseKey("next_public_firebase_project_id"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseKey("next_public_firebase_messaging_sender_id"),
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseKey("next_public_firebase_app_id"),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: firebaseKey("next_public_firebase_vapid_key"),
  CRON_SECRET: z
    .string()
    .min(16)
    .meta({ docUrl: guide("cron_secret") }),
});

export const publicEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_FIREBASE_API_KEY: true,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: true,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: true,
  NEXT_PUBLIC_FIREBASE_APP_ID: true,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: true,
});

let cached: z.infer<typeof envSchema> | undefined;

// Lazy: build and tests run without .env.
export function env() {
  return (cached ??= envSchema.parse(process.env));
}
