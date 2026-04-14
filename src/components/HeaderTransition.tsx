import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";

const HEADER_CROSSFADE_MS = 450;

interface HeaderTransitionProps {
  blackoutActive?: boolean;
}

const HeaderTransition = ({ blackoutActive = false }: HeaderTransitionProps) => {
  const location = useLocation();
  const [displayPathname, setDisplayPathname] = useState(location.pathname);
  const previousLocationKeyRef = useRef(location.key);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (previousLocationKeyRef.current === location.key) return;
    previousLocationKeyRef.current = location.key;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    // Swap header state at the midpoint of the route crossfade so controls
    // (gems, menu visibility) update in sync. No opacity fade — the header
    // is a single persistent element that never fades independently.
    const delay = blackoutActive ? 0 : HEADER_CROSSFADE_MS / 2;
    transitionTimerRef.current = window.setTimeout(() => {
      setDisplayPathname(location.pathname);
      transitionTimerRef.current = null;
    }, delay);
  }, [blackoutActive, location.key, location.pathname]);

  return <Header pathnameOverride={displayPathname} />;
};

export default HeaderTransition;