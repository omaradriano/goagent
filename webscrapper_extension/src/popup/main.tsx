import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmDialogProvider } from "@/popup/components/ConfirmDialog";
import { App } from "@/popup/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </StrictMode>,
);
