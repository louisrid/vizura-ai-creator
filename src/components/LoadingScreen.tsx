import { forwardRef } from "react";

const LoadingScreen = forwardRef<HTMLDivElement>((_props, ref) => {

  // Markup matches main.tsx splash exactly so the transition splash → LoadingScreen
  // shows zero movement: same flex layout, same -4vh offset, same 24px text,
  // same 12px gap, same 14rem × 12px bar, same yellow fill animation.
  return (
    <div
      ref={ref}
      className="fixed inset-0"
      style={{ zIndex: 99999, background: "#000000" }}
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
          gap: 16,
          background: "#000000",
          color: "#ffffff",
          fontFamily: "-apple-system,'SF Pro Display',system-ui,sans-serif",
          fontWeight: 900,
          textTransform: "lowercase",
          letterSpacing: "-0.02em",
          marginTop: "-4vh",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1 }}>loading...</h1>
        <div className="facefox-dots" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </div>
      </div>
    </div>
  );
});

LoadingScreen.displayName = "LoadingScreen";

export default LoadingScreen;
