import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

// One-time global cache reset. Bump this version any time we need to force
// every user back to a clean state (signed out, no facefox_* cache).
const CACHE_VERSION = "2";
const CACHE_VERSION_KEY = "facefox_cache_version";

(() => {
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored === CACHE_VERSION) return;

    // Capture supabase config BEFORE clearing storage so we can sign out cleanly.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

    const purgePrefix = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith("facefox_")) keys.push(k);
      }
      keys.forEach((k) => storage.removeItem(k));
    };

    purgePrefix(localStorage);
    purgePrefix(sessionStorage);

    // Mark as migrated immediately so a failed sign-out can't loop the reload.
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);

    const finishAndReload = () => {
      // Clear any leftover supabase auth tokens that aren't facefox_-prefixed.
      try {
        const sbKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("sb-") || k.startsWith("supabase."))) sbKeys.push(k);
        }
        sbKeys.forEach((k) => localStorage.removeItem(k));
      } catch {}
      window.location.replace("/");
    };

    if (supabaseUrl && supabaseKey) {
      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: false },
      });
      tempClient.auth.signOut().catch(() => {}).finally(finishAndReload);
    } else {
      finishAndReload();
    }

    // Stop the rest of bootstrap; the reload will re-run main.tsx with the new version stamp.
    throw new Error("__facefox_cache_reset__");
  } catch (err) {
    if (err instanceof Error && err.message === "__facefox_cache_reset__") throw err;
    // If anything goes wrong, still stamp the version so we don't infinite-loop.
    try { localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION); } catch {}
  }
})();

// On every fresh page load (including refresh), clear the guided creator
// flow state so the user always starts from the hero screen.
sessionStorage.removeItem("facefox_guided_flow_state");
sessionStorage.removeItem("facefox_hero_seen");

const splash = document.getElementById("splash-screen");

if (splash) {
  Object.assign(splash.style, {
    zIndex: "2147483647",
    opacity: "1",
    transition: "opacity 0.5s ease-in-out",
    pointerEvents: "auto",
    background: "#000",
  });

  splash.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:hsl(0 0% 0%);color:hsl(0 0% 100%);font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;font-weight:900;text-transform:lowercase;letter-spacing:-0.02em;margin-top:-4vh;">
      <h1 style="margin:0;font-size:24px;line-height:1;">loading...</h1>
      <div style="width:14rem;height:12px;overflow:hidden;background:rgba(255,255,255,0.1);border-radius:0;">
        <div style="width:60%;height:12px;background:hsl(54 100% 51%);animation:facefox-loading-bar 1.2s ease-in-out infinite;border-radius:0;"></div>
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")!).render(<App />);
