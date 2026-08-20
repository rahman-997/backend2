import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppV2 from "./AppV2";
import { ErrorBoundary } from "./ErrorBoundary";
import { RuntimeGuard } from "./RuntimeGuard";
import "./styles-v2.css";
import "./runtime.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <RuntimeGuard>
        <AppV2 />
      </RuntimeGuard>
    </ErrorBoundary>
  </StrictMode>,
);
