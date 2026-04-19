import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import initWebVitals from "./perf/reportWebVitals";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Initialize web-vitals RUM reporting
try {
  initWebVitals();
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("Failed to initialize web-vitals", e);
}
