import { createRoot } from "react-dom/client";
import { applyReloadReset } from "./lib/refreshReset";
import "./index.css";

applyReloadReset();

void import("./App.tsx").then(({ default: App }) => {
  createRoot(document.getElementById("root")!).render(<App />);
});
