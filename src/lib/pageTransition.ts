/**
 * Sitewide page transition system.
 * One black overlay at the app root handles every transition:
 * fade in -> swap underneath -> fade out.
 */

export type TransitionSpeed = "fast" | "slow" | "default";

const DURATION = { fadeIn: 150, hold: 0, fadeOut: 200 } as const;

let transitioning = false;
let pendingCallback: (() => void) | null = null;
let globalSafetyTimer: number | null = null;

const clearGlobalSafety = () => {
  if (globalSafetyTimer) { clearTimeout(globalSafetyTimer); globalSafetyTimer = null; }
};

export const isTransitioning = () => transitioning;
export const getDurations = (_speed?: TransitionSpeed) => DURATION;

export const startPageTransition = (_speed: TransitionSpeed = "default", callback: () => void) => {
  if (transitioning || typeof document === "undefined" || document.getElementById("splash-screen")) {
    callback();
    return;
  }

  transitioning = true;
  pendingCallback = callback;
  window.dispatchEvent(new CustomEvent("page-transition:fade-in"));

  // Hard safety: if transition hasn't completed in 800ms, force-complete it
  clearGlobalSafety();
  globalSafetyTimer = window.setTimeout(() => {
    if (transitioning) {
      const cb = pendingCallback;
      pendingCallback = null;
      if (cb) cb();
      transitioning = false;
      window.dispatchEvent(new CustomEvent("page-transition:force-clear"));
    }
  }, 800);
};

export const onOverlayOpaque = () => {
  const callback = pendingCallback;
  pendingCallback = null;
  if (callback) callback();
  window.dispatchEvent(new CustomEvent("page-transition:fade-out"));
};

export const onOverlayTransparent = () => {
  clearGlobalSafety();
  transitioning = false;
};
