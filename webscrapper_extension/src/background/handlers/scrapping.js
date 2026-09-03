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

// La tabla de periodos (GridPeriodos) siempre lista las anualidades en orden
// cronologico ascendente, asi que la ultima fila es la anualidad mas
// reciente - la que hay que consultar. Se evita comparar fechas contra "hoy"
// (traia bugs de zona horaria en el limite de cada anualidad).
function pickCurrentAnualidad(periodos) {
  if (!periodos || periodos.length === 0) return null;
  return periodos[periodos.length - 1];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Intenta pedir datos al content script varias veces: justo tras una
// recarga el content script puede tardar un instante en reinyectarse y la
// primera llamada puede fallar con "Receiving end does not exist".
async function sendMessageWithRetries(tabId, message, attempts = 3, gapMs = 500) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await delay(gapMs);
    }
  }
  throw lastError;
}

// Dispara __doPostBack directamente en el contexto de la pagina (MAIN world),
// igual que se hace para la paginacion de polizas (goToListPage). Es mas
// confiable que simular un click sobre el link "Ver detalle de anualidad"
// desde el content script: el postback ocurre siempre en la misma tarea de
// ejecucion en la que el sitio lo espera, y no depende de que un evento de
// click sintetico dispare correctamente un href "javascript:...".
async function postBackTo(tabId, postbackTarget) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [postbackTarget],
    func: (target) => {
      if (typeof __doPostBack === "function") {
        __doPostBack(target, "");
      }
    },
  });
}

// Navega a la anualidad vigente de una poliza flexible y devuelve el payload
// "flexible" a enviar al backend (prima basica, periodo y pagos UDIS de esa
// anualidad especifica). Nunca lanza, y trata de preservar lo maximo posible
// de lo ya obtenido: si falla el postback o la lectura de pagos, igual
// devuelve prima_basica/periodo (con pagos vacio) en vez de null completo,
// para que el backend pueda al menos registrar la poliza flexible.
async function captureFlexiblePayload(tabId) {
  let periodosRes;
  try {
    periodosRes = await sendMessageWithRetries(tabId, {
      action: "get-flexible-anualidades",
    });
  } catch (error) {
    console.error(
      "[GoAgent][sync] fallo al leer periodos (GridPeriodos) de poliza flexible",
      error,
    );
    return null;
  }

  if (!periodosRes?.success || periodosRes.data.periodos.length === 0) {
    console.warn(
      "[GoAgent][sync] no se encontraron periodos de anualidad para poliza flexible",
    );
    return null;
  }

  const actual = pickCurrentAnualidad(periodosRes.data.periodos);
  if (!actual) return null;

  const base = {
    prima_basica_udis: actual.prima_basica_udis,
    anualidad_desde: actual.desde,
    anualidad_hasta: actual.hasta,
    pagos: [],
  };

  const maxPostbackAttempts = 3;
  for (let attempt = 1; attempt <= maxPostbackAttempts; attempt++) {
    const t0 = Date.now();
    try {
      await postBackTo(tabId, actual.postbackTarget);
    } catch (error) {
      console.error(
        `[GoAgent][sync] intento ${attempt}/${maxPostbackAttempts}: fallo al disparar postback de anualidad`,
        error,
      );
      continue;
    }

    await waitForTabLoad(tabId);

    // Si el postback cayo en una pagina de error de red/proxy (ej. "no
    // healthy upstream" del backend del asegurador), la pestana termina en
    // una URL que no matchea el sitio real - el content script nunca se
    // inyecta ahi y no hay forma de leer nada por mucho que se espere.
    let tabUrl = null;
    try {
      tabUrl = (await chrome.tabs.get(tabId)).url;
    } catch (error) {
      // tab pudo cerrarse; se maneja abajo con la falla de sendMessage
    }
    const urlOk = tabUrl && tabUrl.includes("lineamonterrey.com.mx");
    console.log(
      `[GoAgent][sync] intento ${attempt}/${maxPostbackAttempts}: tab "complete" a los ${Date.now() - t0}ms, url=${tabUrl}`,
    );

    if (!urlOk) {
      console.warn(
        `[GoAgent][sync] intento ${attempt}/${maxPostbackAttempts}: la pagina no aterrizo en el sitio esperado tras el postback (posible falla de red/proxy del lado del asegurador), reintentando`,
      );
      continue;
    }

    try {
      const pagosRes = await sendMessageWithRetries(
        tabId,
        { action: "get-flexible-pagos" },
        6,
        1000,
      );
      console.log(
        `[GoAgent][sync] pagos de anualidad leidos a los ${Date.now() - t0}ms (intento ${attempt})`,
        pagosRes?.data?.debug,
      );
      return { ...base, pagos: pagosRes?.success ? pagosRes.data.pagos : [] };
    } catch (error) {
      console.error(
        `[GoAgent][sync] intento ${attempt}/${maxPostbackAttempts}: fallo al leer pagos (GridIngresos) tras ${Date.now() - t0}ms (url=${tabUrl})`,
        error,
      );
    }
  }

  console.error(
    "[GoAgent][sync] no se pudieron leer los pagos de la poliza flexible tras varios intentos de postback",
  );
  return base;
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
      request.payload.tipo_poliza = "TRADICIONAL";
    } else if (checkType.data.poliza_type_res === "historicoaportaciones") {
      await waitForTabLoad(request.tab);
      request.payload.ultimo_pago = "No definido";
      request.payload.tipo_poliza = "FLEXIBLE";
      request.payload.flexible = await captureFlexiblePayload(request.tab);
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
          message: `Cargando registro ${i + 1} de ${pageItems.length} (página ${pageNum} de ${totalPages})`,
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
          scrapeRes.payload.tipo_poliza = "TRADICIONAL";
        } else if (typeCheck.data.poliza_type_res === "historicoaportaciones") {
          await waitForTabLoad(hiddenTab.id);
          scrapeRes.payload.ultimo_pago = "No definido";
          scrapeRes.payload.tipo_poliza = "FLEXIBLE";
          scrapeRes.payload.flexible = await captureFlexiblePayload(
            hiddenTab.id,
          );
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
