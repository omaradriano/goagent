// Mensajeria del popup. Las acciones y la forma de las respuestas son las
// mismas que ya exponen src/background/router.js y src/content/router.js;
// el popup no tiene logica de negocio propia.

export interface SessionData {
  email: string;
  no_agente: string;
}

export interface BackgroundResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  payload?: T;
}

export interface PolizasDetails {
  total: number;
  activas: number;
  por_vencer: number;
}

export interface PolizaInDb {
  num_poliza: string;
  next_payment: string;
  forma_pago: string;
}

export function sendToBackground<T = unknown>(
  message: Record<string, unknown>,
): Promise<BackgroundResponse<T>> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab<T = unknown>(
  tabId: number,
  message: Record<string, unknown>,
): Promise<BackgroundResponse<T>> {
  return chrome.tabs.sendMessage(tabId, message);
}

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export function openTab(url: string) {
  chrome.tabs.create({ url });
}

// Ultimo correo con el que se inicio sesion, para prellenar el login. Llave
// separada de "jwt": cerrar sesion (que borra "jwt") no lo olvida. Nunca se
// guarda la contrasena.
const LAST_EMAIL_KEY = "last_login_email";

export async function getRememberedEmail(): Promise<string> {
  const stored = await chrome.storage.local.get(LAST_EMAIL_KEY);
  const value = stored[LAST_EMAIL_KEY];
  return typeof value === "string" ? value : "";
}

export async function rememberEmail(email: string) {
  if (!email) return;
  await chrome.storage.local.set({ [LAST_EMAIL_KEY]: email });
}
