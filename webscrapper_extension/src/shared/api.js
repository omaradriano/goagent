import { SERVER_URL } from "./env.js";

export async function apiRequest(path, options = {}) {
  const { jwt } = await chrome.storage.local.get(["jwt"]);
  if (!jwt) throw new Error("No hay sesión activa");

  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data;
}

export async function apiRequestPublic(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return await res.json();
}
