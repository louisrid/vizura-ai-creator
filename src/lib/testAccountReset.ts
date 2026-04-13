import { supabase } from "@/integrations/supabase/client";
import { getResolvedUserEmail } from "@/lib/specialAccount";
import { writeCachedOnboardingState } from "@/lib/onboardingState";
import type { User } from "@supabase/supabase-js";

const TEST_ACCOUNT_EMAIL = "carlsonistrader@gmail.com";
const RESET_SESSION_KEY = "vizura_test_reset_done";

export const isTestResetAccount = (user?: User | null) => {
  if (!user) return false;
  return getResolvedUserEmail(user) === TEST_ACCOUNT_EMAIL;
};

export const maybeResetTestAccount = async (user: User) => {
  if (!isTestResetAccount(user)) return;

  // Only reset once per page load / session
  const sessionFlag = window.sessionStorage.getItem(RESET_SESSION_KEY);
  if (sessionFlag === user.id) return;
  window.sessionStorage.setItem(RESET_SESSION_KEY, user.id);

  try {
    // Reset via edge function (service role needed for updates)
    await supabase.functions.invoke("add-credits", {
      body: { user_id: user.id, action: "test_reset" },
    });

    // Update local onboarding cache to reflect fresh state
    writeCachedOnboardingState({
      userId: user.id,
      onboardingComplete: false,
      characterCount: 0,
      resolvedAt: Date.now(),
    });

    // Clear gems cache so it refetches
    window.sessionStorage.removeItem(`vizura_gems_balance:${user.id}`);
  } catch (err) {
    console.error("Test account reset failed:", err);
  }
};
