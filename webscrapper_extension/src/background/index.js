import { setupBackgroundRouter } from "./router.js";
import { IS_DEV } from "../shared/env.js";

setupBackgroundRouter();

// Badge "DEV" sobre el icono de la barra para distinguir el build local del
// de produccion cuando ambos estan instalados.
if (IS_DEV) {
  chrome.action.setBadgeText({ text: "DEV" });
  chrome.action.setBadgeBackgroundColor({ color: "#d97706" });
}
