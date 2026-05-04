import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// If the user was mid-onboarding when the page loaded, wipe the flow state
// so they land on the hero/start screen fresh
sessionStorage.removeItem("facefox_guided_flow_state");

sessionStorage.removeItem("facefox_post_auth_home");
sessionStorage.removeItem("facefox_signup_gate_active");
sessionStorage.removeItem("facefox_face_options");
sessionStorage.removeItem("facefox_face_prompt");
sessionStorage.removeItem("facefox_guided_prompt");
sessionStorage.removeItem("facefox_character_draft");
sessionStorage.removeItem("facefox_pending_char_id");
sessionStorage.removeItem("facefox_selected_face");
sessionStorage.removeItem("facefox_hero_seen");

sessionStorage.removeItem("facefox_guided_flow_state");

localStorage.removeItem("facefox_pending_creation");

const splash = document.getElementById("splash-screen");

if (splash) {
  Object.assign(splash.style, {
    zIndex: "2147483647",
    opacity: "1",
    transition: "opacity 0.3s ease-in-out",
    pointerEvents: "auto",
    background: "#000000",
  });

  splash.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#000000;color:#ffffff;font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;font-weight:900;text-transform:lowercase;letter-spacing:-0.02em;margin-top:-4vh;">
      <h1 style="margin:0;font-size:24px;line-height:1;">loading...</h1>
      <div style="width:14rem;height:8px;overflow:hidden;background:rgba(255,255,255,0.1);border-radius:9999px;position:relative;">
        <div style="width:40%;height:100%;background:#ffe603;border-radius:9999px;box-shadow:0 0 10px #ffe603, 0 0 20px rgba(255,230,3,0.25);animation:facefox-bar 1.4s ease-in-out infinite;position:absolute;"></div>
      </div>
    </div>
  `;
}

// Pre-register a blocking loader for image-heavy pages so the splash
// stays up on the very first React render. Home.tsx will unblock it
// once all images have loaded (or the safety timeout fires).
import { registerBlockingLoader } from "@/lib/startupSplash";
const hasCachedData = !!localStorage.getItem("facefox_cached_characters");
const isImageRoute = window.location.pathname === "/" || window.location.pathname === "/characters" || window.location.pathname.startsWith("/characters/") || window.location.pathname === "/storage" || window.location.pathname === "/history";
if (splash && hasCachedData && isImageRoute) {
  const earlyUnblock = registerBlockingLoader();
  let released = false;
  const releaseEarly = () => {
    if (released) return;
    released = true;
    earlyUnblock();
    delete (window as any).__facebox_early_unblock;
  };
  (window as any).__facebox_early_unblock = releaseEarly;
  // Global safety: if Home never mounts/claims (e.g. redirect to /auth, route mismatch),
  // never let the splash hang. Release after 8s no matter what.
  setTimeout(releaseEarly, 8000);
}

createRoot(document.getElementById("root")!).render(<App />);
