import type { User } from "@supabase/supabase-js";

export const SPECIAL_ACCOUNT_EMAIL = "louisjridland@gmail.com";
const SPECIAL_ACCOUNT_CACHE_KEY = "facefox_special_account_email";
const SPECIAL_ACCOUNT_USER_ID_KEY = "facefox_special_account_user_id";

const normaliseEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const readCachedSpecialAccount = (user?: User | null) => {
  if (typeof window === "undefined" || !user?.id) return false;

  const cachedEmail = normaliseEmail(window.sessionStorage.getItem(SPECIAL_ACCOUNT_CACHE_KEY));
  const cachedUserId = window.sessionStorage.getItem(SPECIAL_ACCOUNT_USER_ID_KEY);

  return cachedUserId === user.id && cachedEmail === SPECIAL_ACCOUNT_EMAIL;
};

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

export const isSpecialAccountEmail = (value: unknown) =>
  normaliseEmail(value) === SPECIAL_ACCOUNT_EMAIL;

export const isSpecialAccountUser = (user?: User | null) =>
  getResolvedUserEmail(user) === SPECIAL_ACCOUNT_EMAIL;

export const syncSpecialAccountCache = (user?: User | null) => {
  if (typeof window === "undefined") return;

  if (user && isSpecialAccountUser(user)) {
    window.sessionStorage.setItem(SPECIAL_ACCOUNT_CACHE_KEY, SPECIAL_ACCOUNT_EMAIL);
    window.sessionStorage.setItem(SPECIAL_ACCOUNT_USER_ID_KEY, user.id);
    return;
  }

  window.sessionStorage.removeItem(SPECIAL_ACCOUNT_CACHE_KEY);
  window.sessionStorage.removeItem(SPECIAL_ACCOUNT_USER_ID_KEY);
};

export const hasSpecialAccountOverride = (user?: User | null) =>
  isSpecialAccountUser(user) || readCachedSpecialAccount(user);

export const clearSpecialAccountCache = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SPECIAL_ACCOUNT_CACHE_KEY);
  window.sessionStorage.removeItem(SPECIAL_ACCOUNT_USER_ID_KEY);
};