import { Alert } from "./components/alert.js";
import { Loader } from "./components/loader.js";
import { setupAuthView } from "./views/auth.js";
import { IS_DEV, SERVER_URL } from "../shared/env.js";
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

function showDevTag() {
  const header = document.querySelector(".extension__header");
  if (!header) return;
  const tag = document.createElement("span");
  tag.className = "extension__dev-tag";
  tag.textContent = "DEV";
  tag.title = `Build de desarrollo - API: ${SERVER_URL}`;
  header.appendChild(tag);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (IS_DEV) showDevTag();

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
