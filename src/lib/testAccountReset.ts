import { supabase } from "@/integrations/supabase/client";
import { getResolvedUserEmail } from "@/lib/specialAccount";
import { writeCachedOnboardingState } from "@/lib/onboardingState";
import type { User } from "@supabase/supabase-js";

const TEST_ACCOUNT_EMAIL = "carlsonistrader@gmail.com";
const RESET_LOAD_KEY = "facefox_test_reset_done_for_page_load";

/** Keys that must survive mid-flow (e.g. while on /choose-face or viewing a character) */
const PROTECTED_ROUTES = ["/choose-face", "/characters/"];

export const isTestResetAccount = (user?: User | null) => {
  if (!user) return false;
  return getResolvedUserEmail(user) === TEST_ACCOUNT_EMAIL;
};

export const maybeResetTestAccount = async (user: User) => {
  if (!isTestResetAccount(user)) return;

  // Don't reset while user is mid-onboarding flow
  if (typeof window !== "undefined" && PROTECTED_ROUTES.includes(window.location.pathname)) return;

  // Only reset once per actual page load. Window-scoped flag survives tab switches.
  const pageFlags = window as typeof window & { [RESET_LOAD_KEY]?: string };
  const sessionFlag = pageFlags[RESET_LOAD_KEY];
  if (sessionFlag === user.id) return;
  pageFlags[RESET_LOAD_KEY] = user.id;

  try {
    // Reset via edge function (service role needed for deletes/updates)
    const { error, data } = await supabase.functions.invoke("add-credits", {
      body: { user_id: user.id, action: "test_reset" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Fetch actual character count so cache matches reality
    const { count } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    writeCachedOnboardingState({
      userId: user.id,
      onboardingComplete: false,
      characterCount: count ?? 0,
      resolvedAt: Date.now(),
    });

    // Clear all flow-related storage keys
    const keysToRemove = [
      "facefox_character_draft",
      "facefox_character_draft_backup",
      "facefox_face_options",
      "facefox_face_prompt",
      "facefox_guided_prompt",
      "facefox_pending_char_id",
      "facefox_selected_face",
      "facefox_guided_flow_state",
      "facefox_auto_opened",
      "facefox_creator_dismissed",
      "facefox_resume_after_auth",
      `facefox_gems_balance:${user.id}`,
    ];

    for (const key of keysToRemove) {
      try { window.sessionStorage.removeItem(key); } catch {}
      try { window.localStorage.removeItem(key); } catch {}
    }

    // Notify components to re-fetch profile data
    window.dispatchEvent(new CustomEvent("facefox:test-reset-complete"));
  } catch (err) {
    console.error("Test account reset failed:", err);
  }
};
