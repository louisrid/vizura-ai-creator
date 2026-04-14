import { useEffect } from "react";

const LoadingScreen = () => {
  useEffect(() => {
    document.getElementById("splash-screen")?.remove();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background"
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