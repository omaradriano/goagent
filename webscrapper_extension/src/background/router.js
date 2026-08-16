import {
  handleVerifySession,
  handleAuthByGoogle,
  handleAuthByCredentials,
  handleDeleteSession,
} from "./handlers/auth.js";

import {
  handleGetPolizasDetails,
  handleGetAllInDb,
  handlePostUniqueDb,
  handlePostAllDb,
  handleGetUniqueInDb,
} from "./handlers/scrapping.js";

const handlers = {
  "verify-session": handleVerifySession,
  "get-polizas-details": handleGetPolizasDetails,
  "get-all-in-db": handleGetAllInDb,
  "post-unique-db": handlePostUniqueDb,
  "post-all-db": handlePostAllDb,
  "get-unique-in-db": handleGetUniqueInDb,
  "exec-authentication-by-google": handleAuthByGoogle,
  "exec-authentication-by-credentials": handleAuthByCredentials,
  "exec-delete-session": handleDeleteSession,
};

export function setupBackgroundRouter() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handler = handlers[request.action];
    if (!handler) return;
    handler(request, sender, sendResponse);
    return true;
  });
}
