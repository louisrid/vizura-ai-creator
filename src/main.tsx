import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const CACHE_VERSION = "9";
const storedVersion = localStorage.getItem("facefox_cache_version");
if (storedVersion !== CACHE_VERSION) {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("facefox_cache_version", CACHE_VERSION);
}

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
    transition: "opacity 0.5s ease-in-out",
    pointerEvents: "auto",
    background: "#000",
  });

  splash.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:hsl(0 0% 0%);color:hsl(0 0% 100%);font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;font-weight:900;text-transform:lowercase;letter-spacing:-0.02em;margin-top:-4vh;">
      <h1 style="margin:0;font-size:24px;line-height:1;">loading...</h1>
      <div style="width:14rem;height:8px;overflow:hidden;background:rgba(255,255,255,0.1);border-radius:9999px;position:relative;">
        <div style="width:40%;height:100%;background:#ffe603;border-radius:9999px;box-shadow:0 0 10px #ffe603, 0 0 20px rgba(255,230,3,0.25);animation:facefox-bar 1.4s ease-in-out infinite;position:absolute;"></div>
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")!).render(<App />);
