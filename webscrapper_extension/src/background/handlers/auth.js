import { SERVER_URL, FRONTEND_URL } from "../../shared/env.js";
import { apiRequestPublic } from "../../shared/api.js";
import { checkSession } from "../../shared/auth.js";

export async function handleVerifySession(request, sender, sendResponse) {
  try {
    const session = await checkSession();
    sendResponse({ success: true, data: session });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

export function handleAuthByGoogle() {
  const redirectUri = chrome.identity.getRedirectURL();
  const CLIENT_ID =
    "87268387078-qtnefaspmgkf5085j1ijq5vgol9g52nf.apps.googleusercontent.com";

  const authUrl =
    `https://accounts.google.com/o/oauth2/auth` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid email profile` +
    `&prompt=consent`;

  chrome.identity.launchWebAuthFlow(
    { url: authUrl, interactive: true },
    async (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) return;

      const token = extractAccessToken(responseUrl);
      if (!token) return;

      const authRes = await apiRequestPublic("/v1/auth/authenticate/google", {
        method: "POST",
        body: JSON.stringify({ payload: { token } }),
      });

      const passwordStatus = await checkPasswordExists(authRes.payload.email);

      if (passwordStatus.hasPassword) {
        chrome.storage.local.set({ jwt: authRes.payload.jwt_token }, () => {
          chrome.tabs.create({ url: `${FRONTEND_URL}/auth/loggedin` });
        });
      } else {
        chrome.tabs.create({
          url: `${FRONTEND_URL}/auth/setpassword?token=${passwordStatus.passtoken}&setpasswordmode=newuser`,
        });
      }
    },
  );
}

export async function handleAuthByCredentials(request, sender, sendResponse) {
  try {
    const { email, password } = request.credentials;

    const res = await fetch(`${SERVER_URL}/v1/auth/authenticate/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      sendResponse({ success: false, error: "Credenciales inválidas" });
      return;
    }

    const data = await res.json();
    await chrome.storage.local.set({ jwt: data.payload.jwt_token });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

export function handleDeleteSession(request, sender, sendResponse) {
  chrome.storage.local.remove("jwt", () => {
    sendResponse({ success: true });
  });
}

function extractAccessToken(url) {
  const hash = new URL(url).hash.substring(1);
  return new URLSearchParams(hash).get("access_token");
}

async function checkPasswordExists(email) {
  const res = await apiRequestPublic(`/v1/auth/verifyPasswordExist/${email}`);
  if (res.success && !res.payload.haspassword) {
    return { hasPassword: false, passtoken: res.payload.passtoken };
  }
  return { hasPassword: true };
}
