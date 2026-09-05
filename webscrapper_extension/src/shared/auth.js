import { apiRequest } from "./api.js";

export async function checkSession() {
  const data = await apiRequest("/v1/auth/checkSession");
  const { jwt } = await chrome.storage.local.get(["jwt"]);
  return {
    email: data.payload.email,
    jwt,
    no_agente: data.payload.no_agente,
  };
}

export async function getSubscriptionStatus() {
  const data = await apiRequest("/v1/api/subscription_status");
  return data.payload; // { is_subscribed, cancel_at_period_end, current_period_end }
}
