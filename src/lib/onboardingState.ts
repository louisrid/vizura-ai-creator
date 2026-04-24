import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_STATE_KEY = "facefox_onboarding_state";

export type CachedOnboardingState = {
  userId: string;
  onboardingComplete: boolean;
  characterCount: number;
  resolvedAt: number;
};

const canUseStorage = () => typeof window !== "undefined";

export const readCachedOnboardingState = (userId?: string | null): CachedOnboardingState | null => {
  if (!canUseStorage()) return null;

  try {
    const raw = localStorage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedOnboardingState;
    if (!parsed?.userId || (userId && parsed.userId !== userId)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeCachedOnboardingState = (state: CachedOnboardingState) => {
  if (!canUseStorage()) return state;

  try {
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("facefox:onboarding-changed"));
  } catch {}

  return state;
};

export const mergeCachedOnboardingState = (
  userId: string,
  partial: Partial<Pick<CachedOnboardingState, "onboardingComplete" | "characterCount">>,
) => {
  const previous = readCachedOnboardingState(userId);

  return writeCachedOnboardingState({
    userId,
    onboardingComplete: partial.onboardingComplete ?? previous?.onboardingComplete ?? false,
    characterCount: partial.characterCount ?? previous?.characterCount ?? 0,
    resolvedAt: Date.now(),
  });
};

export const clearCachedOnboardingState = () => {
  if (!canUseStorage()) return;

  try {
    localStorage.removeItem(ONBOARDING_STATE_KEY);
  } catch {}
};

export const needsOnboardingRedirect = (state: CachedOnboardingState | null | undefined) =>
  !!state && !state.onboardingComplete && state.characterCount === 0;

export const fetchAndCacheOnboardingState = async (userId: string): Promise<CachedOnboardingState> => {
  try {
    const [profileRes, charsRes] = await Promise.all([
      supabase.from("profiles").select("onboarding_complete").eq("user_id", userId).maybeSingle(),
      supabase.from("characters").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (charsRes.error) throw charsRes.error;

    return writeCachedOnboardingState({
      userId,
      onboardingComplete: !!profileRes.data?.onboarding_complete,
      characterCount: charsRes.count ?? 0,
      resolvedAt: Date.now(),
    });
  } catch (err) {
    console.error("fetchAndCacheOnboardingState failed:", err);
    // Fall back to a permissive default so the UI can unblock. Prefer cached value if we have one.
    const cached = readCachedOnboardingState(userId);
    return cached ?? {
      userId,
      onboardingComplete: true,
      characterCount: 0,
      resolvedAt: Date.now(),
    };
  }
};