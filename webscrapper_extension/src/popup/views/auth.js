import { FRONTEND_URL } from "../../shared/env.js";

export function setupAuthView(changeView, loadManagementUI) {
  const loginBtn = document.getElementById("btn_login");
  const googleLoginBtn = document.getElementById("auth_google_login");
  const validationLabel = document.getElementById("login_valid_credentials");

  loginBtn.addEventListener("click", async () => {
    const email = document.querySelector('[data-login-field="email"]').value;
    const password = document.querySelector(
      '[data-login-field="password"]',
    ).value;

    const chromeRes = await chrome.runtime.sendMessage({
      action: "exec-authentication-by-credentials",
      credentials: { email, password },
    });

    if (!chromeRes.success) {
      validationLabel.style.display = "flex";
      return;
    }

    const authRes = await chrome.runtime.sendMessage({
      action: "verify-session",
    });

    if (!authRes.success) {
      changeView("authentication__signin");
      return;
    }

    changeView("management");
    await loadManagementUI(authRes);
  });

  googleLoginBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "exec-authentication-by-google" });
  });

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-auth-mode]");
    if (!trigger) return;

    const mode = trigger.getAttribute("data-auth-mode");

    switch (mode) {
      case "signup":
        chrome.tabs.create({ url: `${FRONTEND_URL}/auth/register` });
        break;
      case "signin":
        changeView("authentication__signin");
        break;
      case "forgot_password":
        chrome.tabs.create({
          url: `${FRONTEND_URL}/auth/resetpasswordinitflow`,
        });
        break;
    }
  });
}
