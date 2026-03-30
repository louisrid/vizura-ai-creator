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