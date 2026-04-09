/**
 * BETA_MODE flag — when true, whitelisted emails get free unlimited access.
 * When false, real gem deduction and subscription checks apply.
 * One-line switch from testing to live.
 */
export const BETA_MODE = true;

/** Emails that get free unlimited access when BETA_MODE is true */
export const BETA_WHITELIST: string[] = [
  "louisjridland@gmail.com",
];

export const isBetaWhitelisted = (email: string | null | undefined): boolean => {
  if (!BETA_MODE || !email) return false;
  return BETA_WHITELIST.includes(email.trim().toLowerCase());
};
