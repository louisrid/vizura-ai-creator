import { supabase } from "@/integrations/supabase/client";
import { getResolvedUserEmail } from "@/lib/specialAccount";
import { writeCachedOnboardingState } from "@/lib/onboardingState";
import type { User } from "@supabase/supabase-js";

const TEST_ACCOUNT_EMAIL = "carlsonistrader@gmail.com";
const RESET_LOAD_KEY = "facefox_test_reset_done_for_page_load";

export const isTestResetAccount = (user?: User | null) => {
  if (!user) return false;
  return getResolvedUserEmail(user) === TEST_ACCOUNT_EMAIL;
};

export const maybeResetTestAccount = async (user: User) => {
  if (!isTestResetAccount(user)) return;

  // Only reset once per actual page load. sessionStorage survives refreshes,
  // so use a window-scoped flag instead to ensure refresh triggers a new reset.
  const pageFlags = window as typeof window & { [RESET_LOAD_KEY]?: string };
  const sessionFlag = pageFlags[RESET_LOAD_KEY];
  if (sessionFlag === user.id) return;
  pageFlags[RESET_LOAD_KEY] = user.id;

  try {
    // Reset via edge function (service role needed for updates)
    const { error, data } = await supabase.functions.invoke("add-credits", {
      body: { user_id: user.id, action: "test_reset" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Update local onboarding cache to reflect fresh state
    writeCachedOnboardingState({
      userId: user.id,
      onboardingComplete: false,
      characterCount: 0,
      resolvedAt: Date.now(),
    });

    // Clear gems cache so it refetches
    window.sessionStorage.removeItem(`facefox_gems_balance:${user.id}`);

    // Notify components to re-fetch profile data
    window.dispatchEvent(new CustomEvent("facefox:test-reset-complete"));
  } catch (err) {
    console.error("Test account reset failed:", err);
  }
};
