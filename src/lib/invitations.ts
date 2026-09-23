import { createHash, randomBytes } from "node:crypto";

export const INVITATION_EXPIRY_OPTIONS = [
  7,
  14,
  30,
] as const;

export function normalizeInvitationEmail(
  email: string,
) {
  return email.trim().toLowerCase();
}

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function invitationExpiryDate(days: number) {
  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  );
}

export function isInvitationExpiryOption(
  value: number,
): value is (typeof INVITATION_EXPIRY_OPTIONS)[number] {
  return INVITATION_EXPIRY_OPTIONS.includes(
    value as (typeof INVITATION_EXPIRY_OPTIONS)[number],
  );
}

export function invitationBaseUrl() {
  const configuredUrl = process.env.AUTH_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      "AUTH_URL is required to create invitation links",
    );
  }

  return configuredUrl.replace(/\/$/, "");
}
