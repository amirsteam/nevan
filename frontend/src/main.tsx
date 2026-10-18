import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (no request to Google; cached with the other assets).
// Fraunces keeps its optical-size axis, which the headings use.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/fraunces/opsz.css";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initMonitoring } from "./utils/monitoring";

initMonitoring();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
