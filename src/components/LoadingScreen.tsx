import { useLayoutEffect } from "react";
import { registerBlockingLoader } from "@/lib/startupSplash";

const LoadingScreen = () => {
  useLayoutEffect(() => {
    const unregister = registerBlockingLoader();
    return unregister;
  }, []);

  // Markup matches main.tsx splash exactly so the transition splash → LoadingScreen
  // shows zero movement: same flex layout, same -4vh offset, same 24px text,
  // same 12px gap, same 14rem × 12px bar, same yellow fill animation.
  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 99999, background: "#000" }}
      role="status"
      aria-live="polite"
      aria-label="loading"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "hsl(0 0% 0%)",
          color: "hsl(0 0% 100%)",
          fontFamily: "-apple-system,'SF Pro Display',system-ui,sans-serif",
          fontWeight: 900,
          textTransform: "lowercase",
          letterSpacing: "-0.02em",
          marginTop: "-4vh",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1 }}>loading...</h1>
        <div
          style={{
            width: "14rem",
            height: 12,
            overflow: "hidden",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 0,
          }}
        >
          <div
            className="facefox-loading-bar"
            style={{
              width: "60%",
              height: 12,
              background: "hsl(54 100% 51%)",
              borderRadius: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
