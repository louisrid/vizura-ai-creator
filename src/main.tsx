import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Fallback: remove splash after 800ms in case no component removes it
setTimeout(() => document.getElementById("splash-screen")?.remove(), 800);
