import { Alert } from "./components/alert.js";
import { Loader } from "./components/loader.js";
import { setupAuthView } from "./views/auth.js";
import {
  setupManagementView,
  loadManagementUI,
} from "./views/management.js";

function changeView(viewName) {
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.style.display = "none";
    tab.setAttribute("data-tab-active", "false");
    if (tab.getAttribute("data-tab") === viewName) {
      tab.style.display = "unset";
      tab.setAttribute("data-tab-active", "true");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const loader = new Loader();
  loader.show();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const currentPage = tab.url.split("/").pop();
    const currentTabId = tab.id;
    const alert = new Alert();

    setupAuthView(changeView, loadManagementUI);
    setupManagementView(alert, changeView, currentPage, currentTabId);

    const authRes = await chrome.runtime.sendMessage({
      action: "verify-session",
    });

    if (!authRes.success) {
      changeView("authentication__signin");
      return;
    }

    changeView("management");
    await loadManagementUI(authRes);
  } finally {
    loader.close();
  }
});
