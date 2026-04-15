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
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background"
      style={{ zIndex: 999999 }}
      role="status"
      aria-live="polite"
      aria-label="loading"
    >
      <h1 className="text-2xl font-[900] lowercase tracking-tight text-foreground">loading...</h1>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-card">
        <div className="facefox-loading-bar h-full w-[60%] rounded-full bg-neon-yellow" />
      </div>
    </div>
  );
};

export default LoadingScreen;

