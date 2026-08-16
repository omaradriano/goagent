import { apiRequest } from "../../shared/api.js";
import { waitForTabLoad } from "../tab-utils.js";

const LIST_PAGE_URL =
  "https://www.lineamonterrey.com.mx/AsesoresWeb/Consultas/Polizas/Asesor/PolizasAgente.aspx#robot";

export async function handleGetPolizasDetails(request, sender, sendResponse) {
  try {
    const data = await apiRequest("/v1/scrapping/details");
    sendResponse({
      success: true,
      payload: {
        total: data.payload.total ?? 0,
        activas: data.payload.activas ?? 0,
        por_vencer: data.payload.por_vencer ?? 0,
      },
    });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

export async function handleGetAllInDb(request, sender, sendResponse) {
  try {
    const data = await apiRequest("/v1/scrapping/polizas_ids");
    sendResponse({
      success: true,
      origin: "background",
      data: { polizas: data.payload.polizas },
    });
  } catch (error) {
    sendResponse({
      success: false,
      origin: "background",
      message: error.message,
    });
  }
}

export async function handlePostUniqueDb(request, sender, sendResponse) {
  try {
    const checkType = await chrome.tabs.sendMessage(request.tab, {
      action: "get-poliza-type",
    });

    if (checkType.data.poliza_type_res === "recibosaportaciones") {
      await waitForTabLoad(request.tab);
      const recibosRes = await chrome.tabs.sendMessage(request.tab, {
        action: "get-recibos-last-payment",
      });
      request.payload.ultimo_pago =
        recibosRes.data.last_payment ?? "No definido";
    } else {
      request.payload.ultimo_pago = "No definido";
    }

    await apiRequest("/v1/scrapping/poliza", {
      method: "POST",
      body: JSON.stringify({ ...request.payload }),
    });

    sendResponse({
      success: true,
      message: "Se ha cargado el registro satisfactoriamente.",
      payload: { ...request.payload },
    });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

export async function handlePostAllDb(request, sender, sendResponse) {
  const polizasIds = request.payload;
  const originalTabId = request.tab;
  const completedData = [];
  let notificationId = null;

  let notifRes = await chrome.tabs.sendMessage(originalTabId, {
    action: "show-progress-message",
    data: {
      type: "warning",
      status: "success",
      message: "Iniciando carga de registros...",
      submessage:
        "Se está obteniendo información de pólizas, por favor espere...",
    },
  });
  notificationId = notifRes.data.notification_id;

  const hiddenTab = await chrome.tabs.create({
    url: LIST_PAGE_URL,
    active: false,
  });
  await waitForTabLoad(hiddenTab.id);

  for (let i = 0; i < polizasIds.length; i++) {
    if (notificationId) {
      await chrome.tabs.sendMessage(originalTabId, {
        action: "delete-notification",
        data: { notification_id: notificationId },
      });
    }

    notifRes = await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        polizas_count_tracker: { current: i + 1, total: polizasIds.length },
        type: "loading",
        status: "success",
        message: `Cargando registro ${i + 1} de ${polizasIds.length}`,
        submessage:
          "Se está obteniendo información de pólizas, por favor espere...",
      },
    });
    notificationId = notifRes.data.notification_id;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: hiddenTab.id },
        world: "MAIN",
        args: [polizasIds[i].idPostback],
        func: (id) => {
          if (typeof __doPostBack === "function") {
            __doPostBack(id, "");
          }
        },
      });
      await waitForTabLoad(hiddenTab.id);

      const scrapeRes = await chrome.tabs.sendMessage(hiddenTab.id, {
        action: "scrapping-all",
      });

      const typeCheck = await chrome.tabs.sendMessage(hiddenTab.id, {
        action: "get-poliza-type",
      });

      if (typeCheck.data.poliza_type_res === "recibosaportaciones") {
        await waitForTabLoad(hiddenTab.id);
        const recibosRes = await chrome.tabs.sendMessage(hiddenTab.id, {
          action: "get-recibos-last-payment",
        });
        scrapeRes.payload.ultimo_pago =
          recibosRes.data.last_payment ?? "No definido";
      } else {
        scrapeRes.payload.ultimo_pago = "No definido";
      }

      completedData.push({ ...scrapeRes.payload });

      await chrome.tabs.update(hiddenTab.id, { url: LIST_PAGE_URL });
      await waitForTabLoad(hiddenTab.id);
    } catch (e) {
      await chrome.tabs
        .update(hiddenTab.id, { url: LIST_PAGE_URL })
        .catch(() => {});
      await waitForTabLoad(hiddenTab.id).catch(() => {});
    }
  }

  await chrome.tabs.remove(hiddenTab.id).catch(() => {});

  if (notificationId) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "delete-notification",
      data: { notification_id: notificationId },
    });
  }

  try {
    await apiRequest("/v1/scrapping/polizas", {
      method: "POST",
      body: JSON.stringify({ payload: completedData }),
    });

    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "done",
        status: "success",
        message: "Se ha completado la carga de los registros.",
        submessage:
          "Ahora puede consultar los detalles de sus pólizas en la sección de mis pólizas en la aplicación web.",
      },
    });

    sendResponse({
      success: true,
      message: "Se han cargado todos los registros con éxito",
    });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

export async function handleGetUniqueInDb(request, sender, sendResponse) {
  try {
    const data = await apiRequest(
      `/v1/scrapping/poliza/${request.data.num_poliza}`,
    );
    sendResponse({
      success: true,
      payload: {
        num_poliza: data.payload.num_poliza,
        next_payment: data.payload.next_payment,
        forma_pago: data.payload.forma_pago,
      },
    });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}
