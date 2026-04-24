import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAndCacheOnboardingState, readCachedOnboardingState, type CachedOnboardingState } from "@/lib/onboardingState";

const ONBOARDING_CHANGED_EVENT = "facefox:onboarding-changed";

// Single source of truth for onboarding state. Reads cache synchronously on
// mount (no flash), fetches fresh state from DB in background, and listens for
// facefox:onboarding-changed events so mid-session updates propagate instantly.
// Default when no cache: onboardingComplete = true. This is the safe default
// for returning users whose cache was cleared — avoids flashing locks on
// already-onboarded users. First-time users get false written to cache by
// the DB fetch immediately after sign-in.
export function useOnboarded() {
  const { user } = useAuth();
  const [state, setState] = useState<CachedOnboardingState | null>(() => readCachedOnboardingState(user?.id));

  useEffect(() => {
    if (!user) {
      setState(null);
      return;
    }

    setState(readCachedOnboardingState(user.id));

    let cancelled = false;

    void fetchAndCacheOnboardingState(user.id)
      .then((fresh) => {
        if (!cancelled) setState(fresh);
      })
      .catch((err) => {
        console.error("useOnboarded fetch failed:", err);
        if (!cancelled) setState({
          userId: user.id,
          onboardingComplete: true,
          characterCount: 0,
          resolvedAt: Date.now(),
        });
      });

    const handleChange = () => {
      if (!cancelled) setState(readCachedOnboardingState(user.id));
    };
    window.addEventListener(ONBOARDING_CHANGED_EVENT, handleChange);

    return () => {
      cancelled = true;
      window.removeEventListener(ONBOARDING_CHANGED_EVENT, handleChange);
    };
  }, [user?.id]);

  const onboardingComplete = state?.onboardingComplete ?? true;
  const characterCount = state?.characterCount ?? 0;
  const resolved = state !== null;

  return { onboardingComplete, characterCount, resolved };
}
