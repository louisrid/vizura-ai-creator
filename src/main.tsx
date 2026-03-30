import { createRoot } from "react-dom/client";
import "./index.css";
import { applyReloadReset } from "./lib/refreshReset";

applyReloadReset();

const { default: App } = await import("./App.tsx");

createRoot(document.getElementById("root")!).render(<App />);
