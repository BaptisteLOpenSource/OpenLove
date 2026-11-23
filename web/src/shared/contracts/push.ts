import { z } from "zod";

export const pushConfig = z.strictObject({
  projectId: z.string().min(1),
  apiKey: z.string().min(1),
  messagingSenderId: z.string().min(1),
  androidAppId: z.string().min(1),
});

export const registerPushTokenInput = z.strictObject({
  token: z.string().min(1).max(4096),
  platform: z.enum(["web", "android"]),
});

export const pushTokenRegistered = z.strictObject({ registered: z.literal(true) });

const sample = {
  projectId: "openlove-demo",
  apiKey: "demo-api-key",
  messagingSenderId: "123456789012",
  androidAppId: "1:123456789012:android:0123456789abcdef",
};

export const examples = {
  valid: [sample],
  invalid: [{ ...sample, androidAppId: undefined }],
};
