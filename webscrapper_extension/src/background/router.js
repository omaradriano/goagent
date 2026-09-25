import {
  handleVerifySession,
  handleAuthByGoogle,
  handleAuthByCredentials,
  handleDeleteSession,
  handleGetSubscriptionStatus,
  handleSetWebSession,
} from "./handlers/auth.js";

import {
  handleGetPolizasDetails,
  handleGetAllInDb,
  handlePostUniqueDb,
  handlePostAllDb,
  handleGetUniqueInDb,
  handleInterruptSync,
} from "./handlers/scrapping.js";

const handlers = {
  "verify-session": handleVerifySession,
  "get-subscription-status": handleGetSubscriptionStatus,
  "get-polizas-details": handleGetPolizasDetails,
  "get-all-in-db": handleGetAllInDb,
  "post-unique-db": handlePostUniqueDb,
  "post-all-db": handlePostAllDb,
  "get-unique-in-db": handleGetUniqueInDb,
  "interrupt-sync": handleInterruptSync,
  "exec-authentication-by-google": handleAuthByGoogle,
  "exec-authentication-by-credentials": handleAuthByCredentials,
  "exec-delete-session": handleDeleteSession,
};

// Acciones que puede invocar la web de GoAgent (origenes en
// "externally_connectable" del manifest). Mapa separado a proposito: la web
// no debe poder llamar ninguna de las acciones internas de arriba.
const externalHandlers = {
  "set-web-session": handleSetWebSession,
};

export function setupBackgroundRouter() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handler = handlers[request.action];
    if (!handler) return;
    handler(request, sender, sendResponse);
    return true;
  });

  chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
      const handler = externalHandlers[request?.action];
      if (!handler) return;
      handler(request, sender, sendResponse);
      return true;
    },
  );
}
