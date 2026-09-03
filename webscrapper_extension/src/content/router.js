import {
  capturePolizaDetails,
  getPolizasList,
  getPolizasCount,
  getPolizasIds,
  getLastPendingPaymentDate,
  getPolizaType,
  getFlexibleAnualidades,
  getFlexiblePagos,
  getPageAgentNumber,
  getPagerInfo,
} from "./scraper.js";
import {
  showNotification,
  removeNotification,
  genNotificationId,
} from "./notifications.js";

const handlers = {
  "get-all-in-view": handleGetAllInView,
  "get-all-in-view-detailed": handleGetAllInViewDetailed,
  "get-unique-in-view": handleGetUniqueInView,
  "get-polizas-list": handleGetPolizasList,
  "get-pager-info": handleGetPagerInfo,
  "post-all": handlePostAll,
  "scrapping-unique": handleScrappingUnique,
  "scrapping-all": handleScrappingAll,
  "verify-same-session": handleVerifySameSession,
  "show-progress-message": handleShowProgressMessage,
  "delete-notification": handleDeleteNotification,
  "get-recibos-last-payment": handleGetRecibosLastPayment,
  "get-poliza-type": handleGetPolizaType,
  "get-flexible-anualidades": handleGetFlexibleAnualidades,
  "get-flexible-pagos": handleGetFlexiblePagos,
};

export function setupContentRouter() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handler = handlers[request.action];
    if (!handler) return;
    handler(request, sender, sendResponse);
    return true;
  });
}

function handleGetAllInView(request, sender, sendResponse) {
  sendResponse({ success: true, data: { polizas_count: getPolizasCount() } });
}

function handleGetAllInViewDetailed(request, sender, sendResponse) {
  sendResponse({ success: true, data: { polizas: getPolizasIds() } });
}

function handleGetUniqueInView(request, sender, sendResponse) {
  sendResponse({ success: true, data: capturePolizaDetails() });
}

function handleGetPolizasList(request, sender, sendResponse) {
  sendResponse({ success: true, data: { polizas: getPolizasList() } });
}

function handleGetPagerInfo(request, sender, sendResponse) {
  sendResponse({ success: true, data: getPagerInfo() });
}

async function handlePostAll(request, sender, sendResponse) {
  try {
    const backgroundRes = await chrome.runtime.sendMessage({
      tab: request.tab,
      action: "post-all-db",
    });

    sendResponse({ ...backgroundRes });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

async function handleScrappingUnique(request, sender, sendResponse) {
  try {
    const data = capturePolizaDetails();

    const dbRes = await chrome.runtime.sendMessage({
      action: "post-unique-db",
      tab: request.tab,
      payload: data,
    });

    if (!dbRes.success) throw new Error(dbRes?.message);
    sendResponse({ ...dbRes });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

function handleScrappingAll(request, sender, sendResponse) {
  try {
    const data = capturePolizaDetails();
    sendResponse({ payload: data, success: true, message: "Datos capturados" });
  } catch (error) {
    sendResponse({
      success: false,
      message: "No se han podido obtener datos",
    });
  }
}

function handleVerifySameSession(request, sender, sendResponse) {
  const pageAgentNo = getPageAgentNumber();
  const extensionAgentNo = request.data.extension_no_agente;

  if (pageAgentNo === extensionAgentNo) {
    sendResponse({
      success: true,
      message:
        "La sesión en la página coincide con la sesión de la extensión",
    });
  } else {
    sendResponse({
      success: false,
      message:
        "La sesión en la página NO coincide con la sesión de la extensión",
    });
  }
}

function handleShowProgressMessage(request, sender, sendResponse) {
  const notificationId = genNotificationId();
  showNotification({ notification_id: notificationId, ...request.data });
  sendResponse({ success: true, data: { notification_id: notificationId } });
}

function handleDeleteNotification(request, sender, sendResponse) {
  removeNotification(request.data.notification_id);
  sendResponse({ success: true });
}

function handleGetRecibosLastPayment(request, sender, sendResponse) {
  const result = getLastPendingPaymentDate();
  if (result.success) {
    sendResponse({
      success: true,
      data: { last_payment: result.last_payment },
      message: "Se ha obtenido la ultima fecha de pago",
    });
  } else {
    sendResponse({
      success: false,
      data: { last_payment: null },
      message: "No se encontraron filas pendientes",
    });
  }
}

function handleGetPolizaType(request, sender, sendResponse) {
  const polizaType = getPolizaType();
  sendResponse({
    success: polizaType !== null,
    data: { poliza_type_res: polizaType },
  });
}

function handleGetFlexibleAnualidades(request, sender, sendResponse) {
  const result = getFlexibleAnualidades();
  sendResponse({
    success: result.success,
    data: { periodos: result.periodos },
    message: result.success
      ? "Se han obtenido los periodos de la poliza"
      : "No se encontraron periodos de anualidad",
  });
}

function handleGetFlexiblePagos(request, sender, sendResponse) {
  const result = getFlexiblePagos();
  sendResponse({
    success: result.success,
    data: { pagos: result.pagos, debug: result.debug },
    message: "Se han obtenido los pagos de la anualidad",
  });
}
