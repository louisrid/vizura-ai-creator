import { useLayoutEffect, useEffect } from "react";
import { registerBlockingLoader } from "@/lib/startupSplash";

const LoadingScreen = () => {
  useLayoutEffect(() => {
    const unregister = registerBlockingLoader();
    return unregister;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.guidedCreatorOpen = "1";
    return () => { delete document.documentElement.dataset.guidedCreatorOpen; };
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background"
      style={{ zIndex: 9970, marginTop: "-4vh" }}
      role="status"
      aria-live="polite"
      aria-label="loading"
    >
      <h1 className="text-2xl font-[900] lowercase tracking-tight text-foreground">loading...</h1>
      <div className="h-2 w-full max-w-[14rem] overflow-hidden bg-white/10">
        <div className="facefox-loading-bar h-full w-[60%] bg-neon-yellow" />
      </div>
    </div>
  );
};

export default LoadingScreen;

