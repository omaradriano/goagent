import { SERVER_URL } from "./env.js";

export async function apiRequest(path, options = {}) {
  const { jwt } = await chrome.storage.local.get(["jwt"]);
  if (!jwt) throw new Error("No hay sesión activa");

  console.log(`[GoAgent][api] -> ${options.method ?? "GET"} ${path}`, {
    body: options.body,
  });

  let res;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...options.headers,
      },
    });
  } catch (networkError) {
    console.error(`[GoAgent][api] network error on ${path}`, networkError);
    throw networkError;
  }

  console.log(`[GoAgent][api] <- ${res.status} ${path}`);

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    console.error(
      `[GoAgent][api] respuesta no-JSON en ${path} (status ${res.status})`,
      rawText,
    );
    throw new Error(
      `Respuesta inválida del servidor (status ${res.status})`,
    );
  }

  if (!data.success) {
    console.error(`[GoAgent][api] error de negocio en ${path}`, data);
    throw new Error(data.message);
  }

  console.log(`[GoAgent][api] ok ${path}`, data);
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
