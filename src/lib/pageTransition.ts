/**
 * Sitewide page transition system.
 * One black overlay at the app root handles every transition:
 * fade in 500ms -> swap underneath -> fade out 500ms.
 */

export type TransitionSpeed = "fast" | "slow" | "default";

const DURATION = { fadeIn: 150, hold: 0, fadeOut: 200 } as const;

let transitioning = false;
let pendingCallback: (() => void) | null = null;

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
};

export const onOverlayOpaque = () => {
  const callback = pendingCallback;
  pendingCallback = null;
  if (callback) callback();
  window.dispatchEvent(new CustomEvent("page-transition:fade-out"));
};

export const onOverlayTransparent = () => {
  transitioning = false;
};
