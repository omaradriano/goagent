// Puente web -> extension de Chrome para el login desde la web
// (/auth/signin?from=extension). La extension acepta la accion
// "set-web-session" solo desde los origenes de su "externally_connectable",
// y valida el JWT contra el backend antes de guardarlo.

interface ExternalRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
  lastError?: { message?: string };
}

// IDs separados por coma: el de la Chrome Web Store y, en desarrollo, el de
// la extension sin empaquetar. Se prueba cada uno; responde el instalado.
const EXTENSION_IDS = (import.meta.env.VITE_EXTENSION_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function isExtensionLoginRequest(search: string): boolean {
  return new URLSearchParams(search).get("from") === "extension";
}

function getRuntime(): ExternalRuntime | null {
  // chrome.runtime solo existe en la pagina si alguna extension instalada la
  // declara en externally_connectable.
  const runtime = (window as unknown as { chrome?: { runtime?: ExternalRuntime } })
    .chrome?.runtime;
  return runtime?.sendMessage ? runtime : null;
}

function sendToExtension(
  runtime: ExternalRuntime,
  extensionId: string,
  jwt: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(
        extensionId,
        { action: "set-web-session", jwt },
        (response) => {
          // Leer lastError evita el warning de "Unchecked runtime.lastError"
          // cuando ese ID no esta instalado.
          if (runtime.lastError) {
            resolve(false);
            return;
          }
          resolve((response as { success?: boolean } | undefined)?.success === true);
        },
      );
    } catch {
      resolve(false);
    }
  });
}

// Devuelve true si alguna extension instalada acepto la sesion.
export async function sendSessionToExtension(jwt: string): Promise<boolean> {
  const runtime = getRuntime();
  if (!runtime || EXTENSION_IDS.length === 0) return false;

  for (const extensionId of EXTENSION_IDS) {
    if (await sendToExtension(runtime, extensionId, jwt)) return true;
  }
  return false;
}
