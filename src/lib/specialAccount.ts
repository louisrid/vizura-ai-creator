import type { User } from "@supabase/supabase-js";

export const SPECIAL_ACCOUNT_EMAIL = "louisjridland@gmail.com";

const normaliseEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const getResolvedUserEmail = (user?: User | null): string => {
  if (!user) return "";

  const identityEmails = Array.isArray(user.identities)
    ? user.identities.flatMap((identity) => {
        const record = identity as { email?: string | null; identity_data?: { email?: string | null } | null };
        return [record.email, record.identity_data?.email];
      })
    : [];

  const candidates = [
    user.email,
    user.user_metadata?.email,
    user.app_metadata?.email,
    ...identityEmails,
  ];

  return candidates.map(normaliseEmail).find(Boolean) ?? "";
};

export const isSpecialAccountUser = (user?: User | null) =>
  getResolvedUserEmail(user) === SPECIAL_ACCOUNT_EMAIL;