/**
 * Tracks "depth" of navigation so BackButton can decide whether to render.
 *
 * Rules:
 * - Lateral navigations (tab bar, header settings, gem box, logo) call markLateralNav()
 *   before navigating, which resets depth to 0 on the next trackNavigation call.
 * - Arriving at a primary route (tab bar destinations + settings + top-ups) also resets depth.
 * - Any other navigation increments depth.
 *
 * BackButton renders only if depth > 0.
 */

const PRIMARY_ROUTES = ["/", "/create", "/video", "/storage", "/account", "/top-ups"];

let depth = 0;
let lastWasLateral = false;

export const markLateralNav = () => { lastWasLateral = true; };

export const trackNavigation = (pathname: string) => {
  if (lastWasLateral) {
    depth = 0;
    lastWasLateral = false;
    return;
  }
  if (PRIMARY_ROUTES.includes(pathname)) {
    depth = 0;
    return;
  }
  depth++;
};

export const resetNavDepth = () => { depth = 0; lastWasLateral = false; };

export const getNavDepth = () => depth;

// Back-compat shim so any leftover callsites don't break the build.
export const incrementNavDepth = () => { depth++; };
