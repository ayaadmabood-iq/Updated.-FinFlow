import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Initialize i18n
import { initializeMonitoring } from "./lib/monitoring";

// Initialize monitoring (Sentry) as early as possible
initializeMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
