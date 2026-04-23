const LoadingScreen = () => {

  // Markup matches main.tsx splash exactly so the transition splash → LoadingScreen
  // shows zero movement: same flex layout, same -4vh offset, same 24px text,
  // same 12px gap, same 14rem × 12px bar, same yellow fill animation.
  return (
    <div
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
        <div style={{ width: "14rem", height: 8, overflow: "hidden", background: "rgba(255,255,255,0.1)", borderRadius: 9999, position: "relative" }}>
          <div
            style={{
              width: "40%",
              height: "100%",
              background: "linear-gradient(135deg, #d4b8ff, #c4a0ff)",
              borderRadius: 9999,
              boxShadow: "0 0 10px #c4a0ff, 0 0 20px rgba(196,160,255,0.25)",
              animation: "facefox-bar 1.4s ease-in-out infinite",
              position: "absolute",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
