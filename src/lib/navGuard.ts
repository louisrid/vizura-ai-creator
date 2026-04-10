/**
 * Navigation guard system.
 * Pages can register a guard callback that returns true to block navigation.
 * Header and logo clicks check this before navigating.
 */

type GuardCallback = () => boolean;

let activeGuard: GuardCallback | null = null;

/** Register a navigation guard. Returns a cleanup function. */
export const registerNavGuard = (guard: GuardCallback) => {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
};

/** Check if navigation is currently guarded. Returns true if blocked. */
export const checkNavGuard = (): boolean => {
  return activeGuard ? activeGuard() : false;
};
