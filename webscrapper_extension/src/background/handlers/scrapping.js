import { apiRequest } from "../../shared/api.js";
import { getSubscriptionStatus } from "../../shared/auth.js";
import { waitForTabLoad, PortalError } from "../tab-utils.js";

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
    await assertPortalHealthy(tabId, "recibos de la póliza");
    const recibosRes = await chrome.tabs.sendMessage(tabId, {
      action: "get-recibos-last-payment",
    });
    scrapeRes.payload.ultimo_pago =
      recibosRes.data.last_payment ?? "No definido";
    scrapeRes.payload.sin_pendientes = recibosRes.data.sin_pendientes === true;
    scrapeRes.payload.tipo_poliza = "TRADICIONAL";
  } else if (typeCheck.data.poliza_type_res === "historicoaportaciones") {
    await waitForTabLoad(tabId);
    await assertPortalHealthy(tabId, "histórico de aportaciones");
    scrapeRes.payload.ultimo_pago = "No definido";
    scrapeRes.payload.tipo_poliza = "FLEXIBLE";
    scrapeRes.payload.flexible = await captureFlexiblePayload(tabId);
  } else {
    scrapeRes.payload.ultimo_pago = "No definido";
  }

  return scrapeRes.payload;
}

// Verifica que la pestana siga en el portal y que no muestre la pagina de
// error de ASP.NET ("Server Error in '/AsesoresWeb' Application"). Sin esto
// el sync seguia leyendo sobre la pagina de error y todas las polizas
// siguientes fallaban (o la lista se leia vacia y el recorrido terminaba
// antes de tiempo sin avisar).
async function assertPortalHealthy(tabId, context) {
  let url;
  try {
    url = (await chrome.tabs.get(tabId)).url;
  } catch {
    throw new PortalError(`La pestaña de sincronización se cerró (${context})`);
  }
  if (!url || !url.includes("lineamonterrey.com.mx")) {
    throw new PortalError(
      `El portal no respondió (${context}); la página terminó en ${url}`,
    );
  }

  let res;
  try {
    res = await sendMessageWithRetries(tabId, { action: "check-portal-health" });
  } catch {
    // Pagina fuera de las URLs del content script (ej. login del portal por
    // sesion expirada).
    throw new PortalError(`No se pudo leer la página del portal (${context})`);
  }
  if (res?.data?.ok === false) {
    const detail = res.data.detail ? `: ${res.data.detail}` : "";
    throw new PortalError(`El portal respondió con error (${context})${detail}`);
  }
}

function postBackPager(tabId, page) {
  return chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [`Page$${page}`],
    func: (arg) => {
      if (typeof __doPostBack === "function") {
        __doPostBack("ctl00$ContentPlaceHolder1$GVPolList", arg);
      }
    },
  });
}

async function readPager(tabId) {
  const res = await sendMessageWithRetries(tabId, { action: "get-pager-info" });
  return res?.data ?? { currentPage: 1, nextPage: null, totalPages: 1, pages: [] };
}

// Carga la lista desde cero (GET) y llega a targetPage usando solo links de
// pagina que la grilla renderizo. Antes se disparaba Page$N a ciegas: si esa
// lista no mostraba el link a N (filtro de busqueda activo en el portal,
// cambio en el numero de paginas, paginador con rango "1..10 ...") el portal
// respondia "Invalid postback or callback argument". Si N no esta visible se
// avanza por el link mas lejano disponible (ej. "...") hasta llegar, y en
// cada paso se confirma la pagina mostrada.
async function goToListPage(tabId, targetPage) {
  await chrome.tabs.update(tabId, { url: LIST_PAGE_URL });
  await waitForTabLoad(tabId);
  await assertPortalHealthy(tabId, "lista de pólizas");

  let pager = await readPager(tabId);
  for (let hops = 0; pager.currentPage !== targetPage; hops++) {
    if (hops >= 20) {
      throw new PortalError(
        `No se pudo llegar a la página ${targetPage} de la lista del portal`,
      );
    }

    const pages = pager.pages ?? [];
    const step = pages.includes(targetPage)
      ? targetPage
      : Math.max(
          ...pages.filter((p) => p > pager.currentPage && p < targetPage),
        );
    if (!Number.isFinite(step)) {
      throw new PortalError(
        `La página ${targetPage} no está disponible en la lista del portal (páginas visibles: ${pages.join(", ") || "ninguna"})`,
      );
    }

    await postBackPager(tabId, step);
    await waitForTabLoad(tabId);
    await assertPortalHealthy(tabId, `página ${step} de la lista`);

    pager = await readPager(tabId);
    if (pager.currentPage !== step) {
      throw new PortalError(
        `Se esperaba la página ${step} de la lista y el portal mostró la ${pager.currentPage}`,
      );
    }
  }
}

// Abre y captura el detalle de la poliza idPoliza desde la pagina pageNum de
// la grilla. El postback de la grilla apunta a la POSICION de la fila
// (GVPolList$ctlNN$lnkPoliza), no a la poliza: si el orden de la grilla
// cambio desde que se leyo, un target viejo abre otra poliza. Por eso el
// target se resuelve por numero de poliza justo antes de cada postback, y lo
// capturado se valida contra el numero esperado - nunca se devuelve el
// detalle de otra poliza (antes eso terminaba guardando datos/asegurados
// ajenos sobre la poliza esperada). Un reintento desde la grilla; si sigue
// sin coincidir, lanza error y la poliza queda como fallida.
async function capturePolizaByNum(tabId, pageNum, idPoliza) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      await goToListPage(tabId, pageNum);
    }

    const listRes = await chrome.tabs.sendMessage(tabId, {
      action: "get-polizas-list",
    });
    const row = (listRes?.data?.polizas ?? []).find(
      (p) => p.idPoliza === idPoliza,
    );
    if (!row) {
      lastError = new Error(
        `La póliza ${idPoliza} no aparece en la página ${pageNum} de la grilla`,
      );
      console.warn(
        `[GoAgent][sync] intento ${attempt}/${maxAttempts}: ${lastError.message}`,
      );
      continue;
    }

    await postBackTo(tabId, row.idPostback);
    await waitForTabLoad(tabId);
    await assertPortalHealthy(tabId, `detalle de ${idPoliza}`);

    const payload = await scrapeCurrentDetailPage(tabId);
    if (payload.num_poliza === idPoliza) {
      return payload;
    }

    lastError = new Error(
      `Se abrió la póliza ${payload.num_poliza || "(desconocida)"} en lugar de ${idPoliza}; no se guardó`,
    );
    console.warn(
      `[GoAgent][sync] intento ${attempt}/${maxAttempts}: ${lastError.message}`,
    );
  }

  throw lastError;
}

// Errores del portal seguidos (sin una captura exitosa entre ellos) antes de
// detener el recorrido.
const MAX_CONSECUTIVE_PORTAL_ERRORS = 3;
const PORTAL_ABORT_REASON =
  "El portal de Seguros Monterrey respondió con errores varias veces seguidas y la sincronización se detuvo.";

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
    const detailUrl = (await chrome.tabs.get(request.tab)).url;

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
      request.payload.sin_pendientes =
        recibosRes.data.sin_pendientes === true;
      request.payload.tipo_poliza = "TRADICIONAL";
    } else if (checkType.data.poliza_type_res === "historicoaportaciones") {
      await waitForTabLoad(request.tab);
      request.payload.ultimo_pago = "No definido";
      request.payload.tipo_poliza = "FLEXIBLE";
      request.payload.flexible = await captureFlexiblePayload(request.tab);
    } else {
      request.payload.ultimo_pago = "No definido";
    }

    // get-poliza-type navega a Recibos (tradicional) o Historico (flexible), y
    // captureFlexiblePayload puede dejar la pestana en la subpagina de una
    // anualidad - se regresa a la vista de detalle donde el agente inicio el
    // sync para no dejarlo viendo una subpagina intermedia.
    if (checkType.data.poliza_type_res) {
      await chrome.tabs.update(request.tab, { url: detailUrl });
      await waitForTabLoad(request.tab);
    }

    // Si la poliza ya existe (409), el sync manual de un solo registro no
    // debe quedarse en un error confuso - se reintenta como refresco
    // completo (PUT) con los mismos datos ya capturados, igual que ya hace
    // el flujo de resync de cartera completa para candidatas/mismatches.
    let mensaje = "Se ha cargado el registro satisfactoriamente.";
    try {
      await apiRequest("/v1/scrapping/poliza", {
        method: "POST",
        body: JSON.stringify({ ...request.payload }),
      });
    } catch (postError) {
      if (postError.status !== 409) throw postError;

      await apiRequest("/v1/scrapping/poliza", {
        method: "PUT",
        body: JSON.stringify({ ...request.payload }),
      });
      mensaje =
        "El registro ya existía; se actualizó con la información más reciente.";
    }

    await chrome.tabs.sendMessage(request.tab, {
      action: "show-progress-message",
      data: {
        type: "done",
        status: "success",
        message: mensaje,
        submessage: "El registro se ha guardado en la base de datos.",
      },
    });

    sendResponse({
      success: true,
      message: mensaje,
      payload: { ...request.payload },
    });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

export async function handlePostAllDb(request, sender, sendResponse) {
  const originalTabId = request.tab;
  // fullResync: se abre y sobrescribe cada poliza de la cartera, ignorando
  // el filtro de sincronizacion parcial (candidatas/mismatch de estatus).
  const fullResync = request.full === true;

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
    fullResync
      ? "[GoAgent][sync] iniciando RESINCRONIZACION COMPLETA de todas las paginas (sin filtro parcial)"
      : "[GoAgent][sync] iniciando sincronizacion/re-sincronizacion de todas las paginas disponibles",
  );

  let notifRes = await chrome.tabs.sendMessage(originalTabId, {
    action: "show-progress-message",
    data: {
      type: "warning",
      status: "success",
      message: fullResync
        ? "Iniciando resincronización completa..."
        : "Iniciando carga de registros...",
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
  // Motivo por el que el recorrido se detuvo antes de terminar (portal
  // fallando repetidamente o error inesperado). Lo ya capturado se guarda
  // igual en el envio final.
  let abortReason = null;

  if (!syncInterruptRequested) {
  try {
  hiddenTab = await chrome.tabs.create({
    url: LIST_PAGE_URL,
    active: false,
  });
  await waitForTabLoad(hiddenTab.id);
  await assertPortalHealthy(hiddenTab.id, "lista de pólizas");

  let pageNum = 1;
  let consecutivePortalErrors = 0;
  // Polizas ya reintentadas tras recuperar la lista (un reintento por
  // poliza por recorrido).
  const retriedAfterRecovery = new Set();

  while (true) {
    // La pestana puede haber quedado en una pagina de error (ej. fallo la
    // recuperacion de la ultima poliza): sin esta verificacion la lista se
    // leia vacia y el recorrido terminaba sin avisar.
    try {
      await assertPortalHealthy(hiddenTab.id, `página ${pageNum} de la lista`);
    } catch (error) {
      console.warn(
        `[GoAgent][sync] la pagina ${pageNum} no esta sana, recargando la lista`,
        error,
      );
      await goToListPage(hiddenTab.id, pageNum);
    }

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
      if (fullResync) return "refresco (resincronizacion completa)";
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

    const pager = await readPager(hiddenTab.id);
    const totalPages = pager.totalPages ?? pageNum;
    const nextPage = pager.nextPage ?? null;

    console.log(
      `[GoAgent][sync] pagina ${pageNum} de ${totalPages}: ${toProcess.length} poliza(s) requieren accion de ${allPageItems.length} en la pagina`,
    );

    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      const isNew = !dbEstatusMap.has(item.idPoliza);

      totalProcessed++;
      // Avisos de progreso tolerantes: si el agente navego fuera del portal
      // en la pestana original, no poder mostrarlos no debe detener el sync.
      if (notificationId) {
        await chrome.tabs
          .sendMessage(originalTabId, {
            action: "delete-notification",
            data: { notification_id: notificationId },
          })
          .catch(() => {});
      }

      notifRes = await chrome.tabs
        .sendMessage(originalTabId, {
          action: "show-progress-message",
          data: {
            type: "loading",
            status: "success",
            message: `Cargando registro ${i + 1} de ${toProcess.length} (página ${pageNum} de ${totalPages})`,
            submessage:
              "Se está obteniendo información de pólizas, por favor espere...",
            interruptible: true,
          },
        })
        .catch(() => null);
      notificationId = notifRes?.data?.notification_id ?? null;

      try {
        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) postback (${isNew ? "alta" : "refresco"})`,
          item,
        );

        const payload = await capturePolizaByNum(
          hiddenTab.id,
          pageNum,
          item.idPoliza,
        );

        console.log(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) capturado`,
          payload,
        );

        if (isNew) {
          completedData.push({ ...payload });
        } else {
          await apiRequest("/v1/scrapping/poliza", {
            method: "PUT",
            body: JSON.stringify({
              ...payload,
              expected_num_poliza: item.idPoliza,
            }),
          });
          refreshedCount++;
        }

        await goToListPage(hiddenTab.id, pageNum);
        consecutivePortalErrors = 0;
      } catch (e) {
        console.error(
          `[GoAgent][sync] pagina ${pageNum} (${i + 1}/${toProcess.length}) fallo al capturar poliza`,
          item,
          e,
        );

        if (!(e instanceof PortalError)) {
          failedPolizas.push({ poliza: item, error: e.message });
          await goToListPage(hiddenTab.id, pageNum).catch(() => {});
        } else {
          // El portal fallo: se recarga la lista desde cero y, si se
          // recupera, se reintenta esta poliza una vez. Con errores seguidos
          // el portal esta caido o inestable y se detiene el recorrido.
          consecutivePortalErrors++;
          let recovered = false;
          try {
            await goToListPage(hiddenTab.id, pageNum);
            recovered = true;
          } catch (recoveryError) {
            consecutivePortalErrors++;
            console.error(
              `[GoAgent][sync] no se pudo recuperar la lista (pagina ${pageNum})`,
              recoveryError,
            );
          }

          if (consecutivePortalErrors >= MAX_CONSECUTIVE_PORTAL_ERRORS) {
            failedPolizas.push({ poliza: item, error: e.message });
            abortReason = PORTAL_ABORT_REASON;
            console.error(
              `[GoAgent][sync] ${consecutivePortalErrors} errores seguidos del portal, se detiene el recorrido`,
            );
            break;
          }

          if (recovered && !retriedAfterRecovery.has(item.idPoliza)) {
            retriedAfterRecovery.add(item.idPoliza);
            console.warn(
              `[GoAgent][sync] lista recuperada, reintentando ${item.idPoliza}`,
            );
            i--;
            totalProcessed--;
            continue;
          }

          failedPolizas.push({ poliza: item, error: e.message });
        }
      }

      if (syncInterruptRequested) {
        console.log(
          `[GoAgent][sync] interrupcion solicitada, deteniendo despues de la poliza ${totalProcessed}`,
        );
        break;
      }
    }

    if (syncInterruptRequested || abortReason) {
      break;
    }

    if (!nextPage) {
      console.log(
        `[GoAgent][sync] no hay mas paginas despues de la pagina ${pageNum}`,
      );
      break;
    }

    console.log(`[GoAgent][sync] avanzando a la pagina ${nextPage}`);

    // Camino rapido: el link a nextPage viene del paginador de esta misma
    // grilla. Si la pestana no esta sana o el portal falla, se reconstruye la
    // navegacion desde cero con goToListPage.
    let advanced = false;
    try {
      await assertPortalHealthy(hiddenTab.id, `lista antes de ir a la página ${nextPage}`);
      await postBackPager(hiddenTab.id, nextPage);
      await waitForTabLoad(hiddenTab.id);
      await assertPortalHealthy(hiddenTab.id, `página ${nextPage} de la lista`);
      advanced = (await readPager(hiddenTab.id)).currentPage === nextPage;
    } catch (error) {
      console.warn(
        `[GoAgent][sync] fallo el avance directo a la pagina ${nextPage}, recargando la lista`,
        error,
      );
    }
    if (!advanced) {
      await goToListPage(hiddenTab.id, nextPage);
    }
    pageNum = nextPage;
  }
  } catch (error) {
    // Cualquier falla fuera de la captura de una poliza (lista, paginador,
    // pestana) termina el recorrido, pero lo capturado se envia igual abajo.
    // Antes esto reventaba el handler y se perdian las altas acumuladas.
    console.error(
      "[GoAgent][sync] error durante el recorrido, se detiene y se guarda lo capturado",
      error,
    );
    abortReason =
      error instanceof PortalError
        ? PORTAL_ABORT_REASON
        : `La sincronización se detuvo por un error inesperado: ${error.message}`;
  }
  }

  if (failedPolizas.length > 0) {
    console.warn(
      `[GoAgent][sync] ${failedPolizas.length} poliza(s) fallaron y no se incluyen en la carga`,
      failedPolizas,
    );
  }

  console.log(
    `[GoAgent][sync] recorrido finalizado: ${completedData.length} alta(s), ${refreshedCount} refresco(s), ${skippedCount} omitida(s) (interrumpido: ${syncInterruptRequested}, detenido: ${abortReason ?? "no"})`,
  );

  if (hiddenTab) {
    await chrome.tabs.remove(hiddenTab.id).catch(() => {});
  }

  if (notificationId) {
    await chrome.tabs
      .sendMessage(originalTabId, {
        action: "delete-notification",
        data: { notification_id: notificationId },
      })
      .catch(() => {});
  }

  // Aviso de polizas que no se pudieron capturar (ej. se abrio otra poliza,
  // o el portal respondio con error): no se guardo nada de ellas y se
  // reintentan en el proximo sync, o el agente puede sincronizarlas a mano
  // desde su detalle.
  const failedNums = [
    ...new Set(failedPolizas.map((f) => f.poliza.idPoliza)),
  ];
  const failedSubmessage =
    "Se reintentarán en la próxima sincronización. También puedes abrir el detalle de cada una en el portal y usar «Sincronizar registros» en la extensión.";
  const abortSubmessage =
    "Lo capturado hasta ese momento se guardó. Intenta de nuevo en unos minutos; si en la lista de pólizas del portal hay un filtro de búsqueda activo, límpialo antes de sincronizar.";

  // Recorrido detenido (portal fallando o error inesperado) sin nada que
  // guardar: se avisa el motivo en lugar de "todo al dia".
  if (abortReason && completedData.length === 0 && refreshedCount === 0) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "warning",
        status: "success",
        message: `${abortReason} No se guardaron cambios.`,
        submessage: abortSubmessage,
        details: failedNums,
      },
    });

    sendResponse({ success: false, message: abortReason });
    return;
  }

  if (completedData.length === 0 && refreshedCount === 0 && failedNums.length > 0) {
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: {
        type: "warning",
        status: "success",
        message: `No se pudieron sincronizar ${failedNums.length} póliza(s):`,
        submessage: failedSubmessage,
        details: failedNums,
      },
    });

    sendResponse({
      success: true,
      message: `Sincronización sin cambios guardados; ${failedNums.length} póliza(s) fallaron`,
    });
    return;
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
    const hayFallidas = failedNums.length > 0;
    await chrome.tabs.sendMessage(originalTabId, {
      action: "show-progress-message",
      data: abortReason
        ? {
            type: "warning",
            status: "success",
            message: `${abortReason} Se guardaron ${resumen}.`,
            submessage: abortSubmessage,
            details: failedNums,
          }
        : hayFallidas
        ? {
            type: "warning",
            status: "success",
            message: `${syncInterruptRequested ? "Sincronización interrumpida" : "Sincronización completada"} (${resumen}), pero ${failedNums.length} póliza(s) no se pudieron sincronizar:`,
            submessage: failedSubmessage,
            details: failedNums,
          }
        : {
            type: "done",
            status: "success",
            message: syncInterruptRequested
              ? `Sincronización interrumpida. ${resumen} antes de detenerse.`
              : "Se ha completado la sincronización.",
            submessage:
              "Ahora puede consultar los detalles de sus pólizas en la sección de mis pólizas en la aplicación web.",
          },
    });

    const fallidasTexto = hayFallidas
      ? ` ${failedNums.length} póliza(s) fallaron.`
      : "";
    sendResponse({
      success: true,
      message: abortReason
        ? `${abortReason} Se guardaron ${resumen}.${fallidasTexto}`
        : syncInterruptRequested
          ? `Sincronización interrumpida. ${resumen}.${fallidasTexto}`
          : `Sincronización completada: ${resumen}.${fallidasTexto}`,
    });
  } catch (error) {
    console.error(
      `[GoAgent][sync] fallo el POST final a /v1/scrapping/polizas con ${completedData.length} poliza(s)`,
      error,
    );
    // La notificacion de progreso ya se borro arriba: sin este aviso el
    // agente no se enteraba de que las altas no se guardaron.
    await chrome.tabs
      .sendMessage(originalTabId, {
        action: "show-progress-message",
        data: {
          type: "warning",
          status: "success",
          message: `No se pudieron guardar ${completedData.length} póliza(s) nueva(s).`,
          submessage: `Error del servidor de GoAgent: ${error.message}. Vuelve a sincronizar para reintentar.`,
        },
      })
      .catch(() => {});
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
