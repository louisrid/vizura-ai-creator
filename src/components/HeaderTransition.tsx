import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";

const HEADER_CROSSFADE_MS = 450;
const HEADER_HALF_FADE_MS = HEADER_CROSSFADE_MS / 2;

interface HeaderTransitionProps {
  blackoutActive?: boolean;
}

const HeaderTransition = ({ blackoutActive = false }: HeaderTransitionProps) => {
  const location = useLocation();
  const [displayPathname, setDisplayPathname] = useState(location.pathname);
  const [opacity, setOpacity] = useState(1);
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

    if (blackoutActive) {
      setDisplayPathname(location.pathname);
      setOpacity(1);
      return;
    }

    setOpacity(0);
    transitionTimerRef.current = window.setTimeout(() => {
      setDisplayPathname(location.pathname);
      requestAnimationFrame(() => setOpacity(1));
      transitionTimerRef.current = null;
    }, HEADER_HALF_FADE_MS);
  }, [blackoutActive, location.key, location.pathname]);

  return (
    <div
      style={{
        opacity,
        transition: blackoutActive ? "none" : `opacity ${HEADER_HALF_FADE_MS}ms ease-in-out`,
      }}
    >
      <Header pathnameOverride={displayPathname} />
    </div>
  );
};

export default HeaderTransition;