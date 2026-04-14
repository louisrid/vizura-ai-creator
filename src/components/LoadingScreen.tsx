import { useEffect, useState } from "react";

interface LoadingScreenProps {
  /** When true, begin fading out. Removes from DOM after fade completes. */
  fadingOut?: boolean;
  onFadeComplete?: () => void;
}

const LoadingScreen = ({ fadingOut = false, onFadeComplete }: LoadingScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.getElementById("splash-screen")?.remove();
  }, []);

  useEffect(() => {
    if (!fadingOut) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onFadeComplete?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [fadingOut, onFadeComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background"
      style={{
        zIndex: 999999,
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.5s ease-in-out",
        pointerEvents: fadingOut ? "none" : "auto",
      }}
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
