const account = { project_id: "openlove-demo", client_email: "sa@x.test", private_key: "k" };

export const FIREBASE_ENV: Record<string, string> = {
  FIREBASE_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(account)).toString("base64"),
  FIREBASE_ANDROID_APP_ID: "1:1:android:a",
  NEXT_PUBLIC_FIREBASE_API_KEY: "k",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "openlove-demo",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1:web:a",
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: "v",
};
