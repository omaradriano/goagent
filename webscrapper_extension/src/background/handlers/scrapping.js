import { apiRequest } from "../../shared/api.js";
import { waitForTabLoad } from "../tab-utils.js";

const LIST_PAGE_URL =
  "https://www.lineamonterrey.com.mx/AsesoresWeb/Consultas/Polizas/Asesor/PolizasAgente.aspx#robot";

let syncInterruptRequested = false;

export function handleInterruptSync(request, sender, sendResponse) {
  syncInterruptRequested = true;
  console.log(
    "[GoAgent][sync] interrupcion de sincronizacion solicitada por el usuario",
  );
  sendResponse({ success: true });
}

async function goToListPage(tabId, targetPage) {
  await chrome.tabs.update(tabId, { url: LIST_PAGE_URL });
  await waitForTabLoad(tabId);

  if (targetPage > 1) {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [`Page$${targetPage}`],
      func: (arg) => {
        if (typeof __doPostBack === "function") {
          __doPostBack("ctl00$ContentPlaceHolder1$GVPolList", arg);
        }
      },
    });
    await waitForTabLoad(tabId);
  }
}

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
  const originalTabId = request.tab;
  const completedData = [];
  const failedPolizas = [];
  let notificationId = null;
  let totalProcessed = 0;
  syncInterruptRequested = false;

  console.log(
    "[GoAgent][sync] iniciando sincronizacion de todas las paginas disponibles",
  );

  let notifRes = await chrome.tabs.sendMessage(originalTabId, {
    action: "show-progress-message",
    data: {
      type: "warning",
      status: "success",
      message: "Iniciando carga de registros...",
      submessage:
        "Se está obteniendo información de pólizas, por favor espere...",
      interruptible: true,
    },
  });
  notificationId = notifRes.data.notification_id;

  let dbPolizas = [];
  try {
    const dbData = await apiRequest("/v1/scrapping/polizas_ids");
    dbPolizas = dbData.payload.polizas ?? [];
  } catch (error) {
    console.error(
      "[GoAgent][sync] no se pudo obtener la lista de polizas ya sincronizadas",
      error,
    );
  }
  const dbSet = new Set(
    dbPolizas.map((value) => (typeof value === "string" ? value.trim() : value)),
  );

  let hiddenTab = null;

  if (!syncInterruptRequested) {
  hiddenTab = await chrome.tabs.create({
    url: LIST_PAGE_URL,
    active: false,
  });
  await waitForTabLoad(hiddenTab.id);

  let pageNum = 1;

  while (true) {
    const listRes = await chrome.tabs.sendMessage(hiddenTab.id, {
      action: "get-polizas-list",
    });
    const pageItems = (listRes?.data?.polizas ?? []).filter(
      (item) => !dbSet.has(item.idPoliza),
    );

    const pagerRes = await chrome.tabs.sendMessage(hiddenTab.id, {
      action: "get-pager-info",
    });
    const totalPages = pagerRes?.data?.totalPages ?? pageNum;
    const nextPage = pagerRes?.data?.nextPage ?? null;

    console.log(
      `[GoAgent][sync] pagina ${pageNum} de ${totalPages}: ${pageItems.length} poliza(s) nueva(s) de ${listRes?.data?.polizas?.length ?? 0} en la pagina`,
    );

    for (let i = 0; i < pageItems.length; i++) {
      totalProcessed++;
      if (notificationId) {
        await chrome.tabs.sendMessage(originalTabId, {
          action: "delete-notification",
          data: { notification_id: notificationId },
        });
      }

      notifRes = await chrome.tabs.sendMessage(originalTabId, {
        action: "show-progress-message",
        data: {
          type: "loading",
          status: "success",
          message: `Cargando registro ${totalProcessed} (página ${pageNum} de ${totalPages})`,
          submessage:
            "Se está obteniendo información de pólizas, por favor espere...",
          interruptible: true,
        },
      });
      notificationId = notifRes.data.notification_id;

      try {
        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${pageItems.length}) postback`,
          pageItems[i],
        );

        await chrome.scripting.executeScript({
          target: { tabId: hiddenTab.id },
          world: "MAIN",
          args: [pageItems[i].idPostback],
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

        if (!scrapeRes?.success) {
          throw new Error(
            scrapeRes?.message ?? "No se pudieron capturar los datos de la póliza",
          );
        }

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

        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${pageItems.length}) capturado`,
          scrapeRes.payload,
        );

        completedData.push({ ...scrapeRes.payload });

        await goToListPage(hiddenTab.id, pageNum);
      } catch (e) {
        console.error(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${pageItems.length}) fallo al capturar poliza`,
          pageItems[i],
          e,
        );
        failedPolizas.push({ poliza: pageItems[i], error: e.message });

        await goToListPage(hiddenTab.id, pageNum).catch(() => {});
      }

      if (syncInterruptRequested) {
        console.log(
          `[GoAgent][sync] interrupcion solicitada, deteniendo despues de la poliza ${totalProcessed}`,
        );
        break;
      }
    }

    if (syncInterruptRequested) {
      break;
    }

    if (!nextPage) {
      console.log(
        `[GoAgent][sync] no hay mas paginas despues de la pagina ${pageNum}`,
      );
      break;
    }

    console.log(`[GoAgent][sync] avanzando a la pagina ${nextPage}`);

    await chrome.scripting.executeScript({
      target: { tabId: hiddenTab.id },
      world: "MAIN",
      args: [`Page$${nextPage}`],
      func: (arg) => {
        if (typeof __doPostBack === "function") {
          __doPostBack("ctl00$ContentPlaceHolder1$GVPolList", arg);
        }
      },
    });
    await waitForTabLoad(hiddenTab.id);
    pageNum = nextPage;
  }
  }

  if (failedPolizas.length > 0) {
    console.warn(
      `[GoAgent][sync] ${failedPolizas.length} poliza(s) fallaron y no se incluyen en la carga`,
      failedPolizas,
    );
  }

  console.log(
    `[GoAgent][sync] scraping finalizado: ${completedData.length} poliza(s) listas para enviar (interrumpido: ${syncInterruptRequested})`,
  );

  if (hiddenTab) {
    await chrome.tabs.remove(hiddenTab.id).catch(() => {});
  }

  if (notificationId) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "delete-notification",
      data: { notification_id: notificationId },
    });
  }

  if (completedData.length === 0) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "done",
        status: "success",
        message: syncInterruptRequested
          ? "Sincronización interrumpida. No se capturaron registros nuevos."
          : "No hay registros nuevos para sincronizar.",
        submessage: syncInterruptRequested
          ? "No se envió ningún registro a la base de datos."
          : "Todas las pólizas disponibles ya se encuentran en el sistema.",
      },
    });

    sendResponse({
      success: true,
      message: syncInterruptRequested
        ? "Sincronización interrumpida sin registros nuevos"
        : "No hay registros nuevos para sincronizar",
    });
    return;
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
        message: syncInterruptRequested
          ? `Sincronización interrumpida. Se cargaron ${completedData.length} registro(s) antes de detenerse.`
          : "Se ha completado la carga de los registros.",
        submessage:
          "Ahora puede consultar los detalles de sus pólizas en la sección de mis pólizas en la aplicación web.",
      },
    });

    sendResponse({
      success: true,
      message: syncInterruptRequested
        ? `Sincronización interrumpida. Se cargaron ${completedData.length} registro(s).`
        : "Se han cargado todos los registros con éxito",
    });
  } catch (error) {
    console.error(
      `[GoAgent][sync] fallo el POST final a /v1/scrapping/polizas con ${completedData.length} poliza(s)`,
      error,
    );
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
