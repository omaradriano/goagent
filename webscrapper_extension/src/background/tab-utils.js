// Tiempo maximo de espera por una carga del portal. Sin limite, un postback
// que no navega (ej. la pestana quedo en una pagina de error sin
// __doPostBack) dejaba el sync colgado para siempre.
const DEFAULT_TIMEOUT_MS = 90_000;

// Falla del portal de Seguros Monterrey (pagina de error de ASP.NET, proxy
// caido, sesion del portal perdida, carga que no termina). El sync intenta
// recuperarse recargando la lista y, si se repite, se detiene ordenadamente.
export class PortalError extends Error {
  constructor(message) {
    super(message);
    this.name = "PortalError";
  }
}

export function waitForTabLoad(tabId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(
        new PortalError(
          `La página del portal no terminó de cargar en ${Math.round(timeoutMs / 1000)} s`,
        ),
      );
    }, timeoutMs);

    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
