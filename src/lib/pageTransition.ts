/**
 * Page Transition System
 *
 * Simple overlay-based transitions: fade to black → swap page → fade from black.
 *
 * SLOW (hero "start" only): 500ms in, 100ms hold, 500ms out
 * FAST (everything else):   300ms in, 0ms hold, 300ms out
 */

export type TransitionSpeed = "slow" | "fast";

const DURATIONS = {
  slow: { fadeIn: 500, hold: 100, fadeOut: 500 },
  fast: { fadeIn: 300, hold: 0, fadeOut: 300 },
} as const;

let _transitioning = false;
let _pendingCallback: (() => void) | null = null;
let _currentSpeed: TransitionSpeed = "fast";

export const isTransitioning = () => _transitioning;

export const getDurations = (speed: TransitionSpeed) => DURATIONS[speed];

/**
 * Start a page transition.
 * 1. Dispatches fade-in event → overlay fades to opaque
 * 2. When opaque, executes callback (which should call navigate)
 * 3. After hold, dispatches fade-out event → overlay fades to transparent
 */
export const startPageTransition = (speed: TransitionSpeed, callback: () => void) => {
  // If already transitioning or splash still showing, just navigate immediately
  if (_transitioning || document.getElementById("splash-screen")) {
    callback();
    return;
  }

  _transitioning = true;
  _currentSpeed = speed;
  _pendingCallback = callback;

  window.dispatchEvent(
    new CustomEvent("page-transition:fade-in", { detail: { speed } })
  );
};

/** Called by the overlay when it's fully opaque */
export const onOverlayOpaque = () => {
  const cb = _pendingCallback;
  _pendingCallback = null;

  // Execute the navigation
  if (cb) cb();

  // After hold period, start fade out
  const hold = DURATIONS[_currentSpeed].hold;
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("page-transition:fade-out", { detail: { speed: _currentSpeed } })
    );
  }, hold);
};

/** Called by the overlay when it's fully transparent again */
export const onOverlayTransparent = () => {
  _transitioning = false;
};
