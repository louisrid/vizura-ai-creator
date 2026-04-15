import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";
import { startPageTransition, type TransitionSpeed } from "@/lib/pageTransition";

/**
 * Drop-in replacement for useNavigate that wraps every navigation
 * in the black overlay transition system.
 *
 * Usage:
 *   const navigate = useTransitionNavigate();
 *   navigate("/path");                       // fast transition
 *   navigate("/path", { speed: "slow" });    // slow transition (hero start only)
 *   navigate(-1);                            // fast back
 */
export const useTransitionNavigate = () => {
  const navigate = useNavigate();

  return useCallback(
    (
      to: string | number,
      options?: NavigateOptions & { speed?: TransitionSpeed }
    ) => {
      const speed = options?.speed || "fast";
      const navOptions: NavigateOptions | undefined = options
        ? { replace: options.replace, state: options.state, preventScrollReset: options.preventScrollReset }
        : undefined;

      if (speed === "slow") {
        startPageTransition(speed, () => {
          if (typeof to === "number") {
            navigate(to);
          } else {
            navigate(to, navOptions);
          }
        });
      } else {
        if (typeof to === "number") {
          navigate(to);
        } else {
          navigate(to, navOptions);
        }
      }
    },
    [navigate]
  );
};
