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
