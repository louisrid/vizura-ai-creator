import { createRoot } from "react-dom/client";
import { applyReloadReset } from "./lib/refreshReset";
import "./index.css";

void applyReloadReset().finally(() => {
  void import("./App.tsx").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
});
