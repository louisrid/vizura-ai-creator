import { supabase } from "@/integrations/supabase/client";

// Invokes the /generate edge function with token refresh and tab-suspension
// retry. Used by ChooseFace for face generation and face regeneration.
// Handles:
//   - proactive session refresh if access token is missing
//   - retry once if server returns Unauthorized (refresh session and re-invoke)
//   - retry on iOS Safari tab-suspension fetch failures (waits for tab to be visible again)
export const invokeGenerate = async (body: Record<string, unknown>, retriesLeft = 2): Promise<any> => {
  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData?.session?.access_token;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token;
  }
  if (!token) throw new Error("Unauthorized");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/generate`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok && result?.error === "Unauthorized") {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session) {
        return invokeGenerate(body, 0);
      }
    }

    return result;
  } catch (networkErr: any) {
    if (retriesLeft > 0 && (networkErr?.name === "TypeError" || networkErr?.message?.includes("fetch"))) {
      console.warn("Fetch failed (likely tab suspended), waiting to retry…", networkErr?.message);
      await new Promise<void>((resolve) => {
        if (document.visibilityState === "visible") {
          setTimeout(resolve, 1000);
        } else {
          const onVisible = () => {
            if (document.visibilityState === "visible") {
              document.removeEventListener("visibilitychange", onVisible);
              setTimeout(resolve, 500);
            }
          };
          document.addEventListener("visibilitychange", onVisible);
        }
      });
      await supabase.auth.refreshSession();
      return invokeGenerate(body, retriesLeft - 1);
    }
    throw networkErr;
  }
};
