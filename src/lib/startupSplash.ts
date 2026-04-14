const SPLASH_ID = "splash-screen";
const BLOCKING_LOADERS_EVENT = "facefox:blocking-loaders";
const SPLASH_FADE_MS = 500;
const MIN_SPLASH_MS = 2000;

let blockingLoaders = 0;
let splashRemoved = false;
let splashRemoveTimer: number | null = null;
let splashShownAt: number = typeof performance !== "undefined" ? performance.now() : Date.now();

const dispatchBlockingLoaders = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BLOCKING_LOADERS_EVENT, { detail: blockingLoaders }));
};

export const getBlockingLoadersEventName = () => BLOCKING_LOADERS_EVENT;

export const getBlockingLoaderCount = () => blockingLoaders;

export const registerBlockingLoader = () => {
  if (typeof window === "undefined") return () => {};

  blockingLoaders += 1;
  dispatchBlockingLoaders();

  return () => {
    blockingLoaders = Math.max(0, blockingLoaders - 1);
    dispatchBlockingLoaders();
  };
};

export const hideStartupSplash = () => {
  if (typeof document === "undefined" || splashRemoved) return;

  const splash = document.getElementById(SPLASH_ID);
  if (!splash) {
    splashRemoved = true;
    return;
  }

  if (splash.dataset.state === "fading") return;

  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - splashShownAt;
  const remaining = MIN_SPLASH_MS - elapsed;

  if (remaining > 0) {
    setTimeout(() => hideStartupSplash(), remaining);
    return;
  }

  splash.dataset.state = "fading";
  splash.style.opacity = "0";
  splash.style.pointerEvents = "none";

  if (splashRemoveTimer) window.clearTimeout(splashRemoveTimer);
  splashRemoveTimer = window.setTimeout(() => {
    splash.remove();
    splashRemoved = true;
    splashRemoveTimer = null;
  }, SPLASH_FADE_MS);
};
