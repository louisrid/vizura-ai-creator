import { supabase } from "@/integrations/supabase/client";

const clearBrowserState = () => {
  try {
    document.cookie.split(";").forEach((cookie) => {
      const separatorIndex = cookie.indexOf("=");
      const name = separatorIndex > -1 ? cookie.slice(0, separatorIndex).trim() : cookie.trim();
      if (!name) return;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  } catch {
    // ignore cookie access issues
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore storage access issues
  }

  try {
    window.localStorage.clear();
  } catch {
    // ignore storage access issues
  }
};

export const applyReloadReset = async () => {
  if (typeof window === "undefined") return;

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore signout failures during reset
  }

  clearBrowserState();

  if (window.location.pathname !== "/") {
    window.history.replaceState(window.history.state, "", "/");
  }
};