import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const MIN_SWIPE_DISTANCE = 30;
const MAX_SWIPE_TIME = 600;
const SWIPE_COOLDOWN = 120;

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number; side: "left" | "right" } | null>(null);
  const lastSwipeRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const side = touch.clientX < window.innerWidth * 0.6 ? "left" : "right";
      touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), side };
    };

    const onEnd = (e: TouchEvent) => {
      const start = touchRef.current;
      if (!start) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      touchRef.current = null;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dt = Date.now() - start.t;

      // Must be mostly horizontal and fast enough
      if (dt > MAX_SWIPE_TIME || Math.abs(dy) > Math.abs(dx) * 0.8) return;
      if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;

      const now = Date.now();
      if (now - lastSwipeRef.current < SWIPE_COOLDOWN) return;

      if (start.side === "left" && dx > 0) {
        // Swipe-back: dispatch a cancelable custom event so pages can intercept
        const evt = new CustomEvent("vizura:swipe-back", { cancelable: true });
        const allowed = window.dispatchEvent(evt);
        if (!allowed) return; // a listener called preventDefault()
        lastSwipeRef.current = now;
        navigate(-1);
      } else if (start.side === "right" && dx < 0) {
        lastSwipeRef.current = now;
        navigate(1);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [navigate]);
}
