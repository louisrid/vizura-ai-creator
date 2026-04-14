import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:hsl(0 0% 0%);color:hsl(0 0% 100%);font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;font-weight:900;text-transform:lowercase;letter-spacing:-0.02em;">
      <h1 style="margin:0;font-size:24px;line-height:1;">loading...</h1>
      <div style="width:12rem;height:0.5rem;border-radius:9999px;overflow:hidden;background:hsl(0 0% 6%);">
        <div style="width:60%;height:100%;border-radius:9999px;background:hsl(54 100% 51%);animation:facefox-loading-bar 1.2s ease-in-out infinite;"></div>
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")!).render(<App />);
