const PARTNER_ROLES = ["partner_a", "partner_b"] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

// Server-written claim only: user_metadata is user-editable and never authorizes.
export function roleOf(claims: { app_metadata?: unknown } | null | undefined): PartnerRole | null {
  const role = (claims?.app_metadata as { role?: unknown } | undefined)?.role;
  return PARTNER_ROLES.find((r) => r === role) ?? null;
}
