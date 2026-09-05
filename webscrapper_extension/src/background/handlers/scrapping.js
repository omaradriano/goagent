import { apiRequest } from "../../shared/api.js";
import { getSubscriptionStatus } from "../../shared/auth.js";
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

// Captura el detalle completo (scrapping-all + branch TRADICIONAL/FLEXIBLE)
// de la poliza actualmente cargada en tabId, despues de que ya se disparo el
// postback y se espero la carga de la pagina. Compartido por el flujo de
// alta (POST) y el de resync de pólizas existentes (PUT) dentro de
// handlePostAllDb - la interaccion DOM es identica, solo cambia la llamada
// API final.
async function scrapeCurrentDetailPage(tabId) {
  const scrapeRes = await chrome.tabs.sendMessage(tabId, {
    action: "scrapping-all",
  });

  if (!scrapeRes?.success) {
    throw new Error(
      scrapeRes?.message ?? "No se pudieron capturar los datos de la póliza",
    );
  }

  const typeCheck = await chrome.tabs.sendMessage(tabId, {
    action: "get-poliza-type",
  });

  if (typeCheck.data.poliza_type_res === "recibosaportaciones") {
    await waitForTabLoad(tabId);
    const recibosRes = await chrome.tabs.sendMessage(tabId, {
      action: "get-recibos-last-payment",
    });
    scrapeRes.payload.ultimo_pago =
      recibosRes.data.last_payment ?? "No definido";
    scrapeRes.payload.tipo_poliza = "TRADICIONAL";
  } else if (typeCheck.data.poliza_type_res === "historicoaportaciones") {
    await waitForTabLoad(tabId);
    scrapeRes.payload.ultimo_pago = "No definido";
    scrapeRes.payload.tipo_poliza = "FLEXIBLE";
    scrapeRes.payload.flexible = await captureFlexiblePayload(tabId);
  } else {
    scrapeRes.payload.ultimo_pago = "No definido";
  }

  return scrapeRes.payload;
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

const NO_SUBSCRIPTION_MESSAGE =
  "Se requiere una suscripción activa para sincronizar tu cartera.";

// Verifica el estatus de suscripcion ANTES de tocar el sitio del asegurador
// (abrir tabs, hacer postback, leer detalle) - el backend ya rechaza el
// guardado final sin suscripcion activa, pero sin este chequeo la extension
// igual gastaria minutos recorriendo toda la cartera para nada. Fail-safe:
// si la consulta de estatus falla (red, etc.), se trata igual que "no
// suscrito" - no se arriesga a permitir el scraping sin haber podido
// confirmar la suscripcion. Devuelve true si el flujo debe abortar.
async function blockIfNoActiveSubscription(originalTabId) {
  const subscription = await getSubscriptionStatus().catch(() => null);
  if (subscription?.is_subscribed) return false;

  await chrome.tabs.sendMessage(originalTabId, {
    action: "show-progress-message",
    data: {
      type: "warning",
      status: "success",
      message: NO_SUBSCRIPTION_MESSAGE,
      submessage:
        "Reactiva tu suscripción desde la aplicación web para continuar.",
    },
  });
  return true;
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
  if (await blockIfNoActiveSubscription(request.tab)) {
    sendResponse({ success: false, message: NO_SUBSCRIPTION_MESSAGE });
    return;
  }

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

  if (await blockIfNoActiveSubscription(originalTabId)) {
    sendResponse({ success: false, message: NO_SUBSCRIPTION_MESSAGE });
    return;
  }

  const completedData = [];
  const failedPolizas = [];
  let refreshedCount = 0;
  let skippedCount = 0;
  let notificationId = null;
  let totalProcessed = 0;
  syncInterruptRequested = false;

  console.log(
    "[GoAgent][sync] iniciando sincronizacion/re-sincronizacion de todas las paginas disponibles",
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

  // candidateSet: numpoliza dentro de la ventana "proximas a vencer"
  // (agentes.daysuntiladvice) - requieren refresco completo aunque su
  // estatus no haya cambiado. dbEstatusMap: numpoliza+estatus de TODA la
  // cartera ya sincronizada - sirve tanto para detectar mismatches de
  // estatus (refresco completo) como para saber si una poliza ya es
  // conocida (sus llaves reemplazan la vieja consulta a
  // /v1/scrapping/polizas_ids).
  let candidateSet = new Set();
  let dbEstatusMap = new Map();
  try {
    const [candidatesData, estatusData] = await Promise.all([
      apiRequest("/v1/scrapping/resync/candidates"),
      apiRequest("/v1/scrapping/resync/estatus"),
    ]);
    candidateSet = new Set(candidatesData.payload.numpolizas ?? []);
    dbEstatusMap = new Map(
      (estatusData.payload.polizas ?? []).map((p) => [
        p.numpoliza,
        p.estatus,
      ]),
    );

    console.log(
      `[GoAgent][sync][db] candidatas por vencimiento (daysuntiladvice): ${candidateSet.size}`,
      Array.from(candidateSet),
    );
    console.log(
      `[GoAgent][sync][db] estatus guardado en BD para toda la cartera: ${dbEstatusMap.size} poliza(s)`,
      Object.fromEntries(dbEstatusMap),
    );
  } catch (error) {
    console.error(
      "[GoAgent][sync] no se pudo obtener el estado de sincronizacion previo (candidatas/estatus)",
      error,
    );
  }

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
    const allPageItems = listRes?.data?.polizas ?? [];

    console.log(
      `[GoAgent][sync][grid] pagina ${pageNum}: ${allPageItems.length} poliza(s) leidas de la grilla (numpoliza+estatus en vivo)`,
      allPageItems.map((item) => ({
        numpoliza: item.idPoliza,
        estatus_grilla: item.estatus,
      })),
    );

    // Una fila necesita accion cuando: (a) su numpoliza no esta en BD
    // todavia (alta), o (b) esta dentro de la ventana de vencimiento
    // (refresco completo), o (c) su estatus en vivo difiere del guardado
    // (refresco completo - un cambio de estatus suele venir acompañado de
    // otros cambios). El resto se omite: no vale la pena abrir su detalle.
    function motivo(item) {
      if (!dbEstatusMap.has(item.idPoliza)) return "alta (no existe en BD)";
      if (candidateSet.has(item.idPoliza)) return "refresco (proxima a vencer)";
      if (dbEstatusMap.get(item.idPoliza) !== item.estatus) {
        return `refresco (estatus BD="${dbEstatusMap.get(item.idPoliza)}" vs grilla="${item.estatus}")`;
      }
      return "omitida (sin cambios)";
    }

    const toProcess = allPageItems.filter((item) => motivo(item) !== "omitida (sin cambios)");
    skippedCount += allPageItems.length - toProcess.length;

    console.log(
      `[GoAgent][sync][plan] pagina ${pageNum}: mapa de acciones para ${allPageItems.length} poliza(s)`,
      allPageItems.map((item) => ({
        numpoliza: item.idPoliza,
        estatus_grilla: item.estatus,
        estatus_bd: dbEstatusMap.get(item.idPoliza) ?? "(nueva)",
        accion: motivo(item),
      })),
    );

    const pagerRes = await chrome.tabs.sendMessage(hiddenTab.id, {
      action: "get-pager-info",
    });
    const totalPages = pagerRes?.data?.totalPages ?? pageNum;
    const nextPage = pagerRes?.data?.nextPage ?? null;

    console.log(
      `[GoAgent][sync] pagina ${pageNum} de ${totalPages}: ${toProcess.length} poliza(s) requieren accion de ${allPageItems.length} en la pagina`,
    );

    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      const isNew = !dbEstatusMap.has(item.idPoliza);

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
          message: `Cargando registro ${i + 1} de ${toProcess.length} (página ${pageNum} de ${totalPages})`,
          submessage:
            "Se está obteniendo información de pólizas, por favor espere...",
          interruptible: true,
        },
      });
      notificationId = notifRes.data.notification_id;

      try {
        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) postback (${isNew ? "alta" : "refresco"})`,
          item,
        );

        await postBackTo(hiddenTab.id, item.idPostback);
        await waitForTabLoad(hiddenTab.id);

        const payload = await scrapeCurrentDetailPage(hiddenTab.id);

        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) capturado`,
          payload,
        );

        if (isNew) {
          completedData.push({ ...payload });
        } else {
          await apiRequest("/v1/scrapping/poliza", {
            method: "PUT",
            body: JSON.stringify({ ...payload, num_poliza: item.idPoliza }),
          });
          refreshedCount++;
        }

        await goToListPage(hiddenTab.id, pageNum);
      } catch (e) {
        console.error(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) fallo al capturar poliza`,
          item,
          e,
        );
        failedPolizas.push({ poliza: item, error: e.message });

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
    `[GoAgent][sync] recorrido finalizado: ${completedData.length} alta(s), ${refreshedCount} refresco(s), ${skippedCount} omitida(s) (interrumpido: ${syncInterruptRequested})`,
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

  if (completedData.length === 0 && refreshedCount === 0) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "done",
        status: "success",
        message: syncInterruptRequested
          ? "Sincronización interrumpida. No se capturaron cambios."
          : "No hay cambios que sincronizar.",
        submessage: syncInterruptRequested
          ? "No se envió ningún registro a la base de datos."
          : "Todas las pólizas disponibles ya están al día en el sistema.",
      },
    });

    sendResponse({
      success: true,
      message: syncInterruptRequested
        ? "Sincronización interrumpida sin cambios"
        : "No hay cambios que sincronizar",
    });
    return;
  }

  try {
    if (completedData.length > 0) {
      await apiRequest("/v1/scrapping/polizas", {
        method: "POST",
        body: JSON.stringify({ payload: completedData }),
      });
    }

    const resumen = `${completedData.length} nueva(s), ${refreshedCount} actualizada(s)`;
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "done",
        status: "success",
        message: syncInterruptRequested
          ? `Sincronización interrumpida. ${resumen} antes de detenerse.`
          : "Se ha completado la sincronización.",
        submessage:
          "Ahora puede consultar los detalles de sus pólizas en la sección de mis pólizas en la aplicación web.",
      },
    });

    sendResponse({
      success: true,
      message: syncInterruptRequested
        ? `Sincronización interrumpida. ${resumen}.`
        : `Sincronización completada: ${resumen}.`,
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
