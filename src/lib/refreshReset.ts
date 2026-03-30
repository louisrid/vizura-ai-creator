const isReloadNavigation = () => {
  if (typeof window === "undefined") return false;

  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigationEntry?.type === "reload") return true;

  const legacyNavigation = (performance as Performance & {
    navigation?: { type?: number; TYPE_RELOAD?: number };
  }).navigation;

  return legacyNavigation?.type === legacyNavigation?.TYPE_RELOAD;
};

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

export const applyReloadReset = () => {
  if (typeof window === "undefined" || !isReloadNavigation()) return;

  clearBrowserState();

  if (window.location.pathname !== "/") {
    window.history.replaceState(window.history.state, "", "/");
  }
};