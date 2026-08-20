import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppV2 from "./AppV2";
import "./styles-v2.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppV2 />
  </StrictMode>,
);
