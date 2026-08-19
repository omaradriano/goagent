import { formatDateDisplay } from "../../shared/dates.js";
import { filterNewPolizas } from "../../shared/compare.js";

const CONFIGURED_PAGES = {
  all: "PolizasAgente.aspx",
  unique: "DetallePoliza.aspx",
};

let currentTabId;
let currentPage;
let globalPolizaNum;
let alertModal;
let changeViewFn;

const elements = {};

function cacheElements() {
  elements.syncBtn = document.getElementById("load_data_button");
  elements.regTotalCount = document.getElementById("reg_total_count");
  elements.regNoLoadedCount = document.getElementById("reg_no_loaded_count");
  elements.tagTotal = document.getElementById("tag__total");
  elements.totalActivas = document.getElementById("total__activas");
  elements.totalPorVencer = document.getElementById("total__pago_proximo");
  elements.syncMessageLabel = document.getElementById(
    "management_sync_details__no-data",
  );
  elements.syncDetailsRows = document.getElementById(
    "management_sync_details__rows",
  );
  elements.detailNumPoliza = document.getElementById(
    "management_sync_details_numpoliza",
  );
  elements.detailNextPayment = document.getElementById(
    "management_sync_details_nextpayment",
  );
  elements.detailPeriod = document.getElementById(
    "management_sync_details_period",
  );
  elements.userEmail = document.getElementById("user__email");
  elements.userNoAgente = document.getElementById("user__no_agente");
  elements.logoutBtn = document.getElementById("user__logout");
}

export function setupManagementView(alert, changeView, page, tabId) {
  alertModal = alert;
  changeViewFn = changeView;
  currentPage = page;
  currentTabId = tabId;

  cacheElements();

  elements.logoutBtn.addEventListener("click", handleLogout);
  elements.syncBtn.addEventListener("click", handleSync);
}

export async function loadManagementUI(authRes) {
  elements.userEmail.innerText = authRes.data.email;
  elements.userNoAgente.innerText = `No. Asesor ${authRes.data.no_agente}`;

  const detailsRes = await chrome.runtime.sendMessage({
    action: "get-polizas-details",
  });

  elements.tagTotal.innerText = detailsRes.payload.total;
  elements.totalActivas.innerText = detailsRes.payload.activas;
  elements.totalPorVencer.innerText = detailsRes.payload.por_vencer;

  const isCompatible = Object.values(CONFIGURED_PAGES).includes(currentPage);

  if (!isCompatible) {
    elements.syncMessageLabel.style.display = "flex";
    elements.syncMessageLabel.innerText = "Esta ventana no es compatible";
    elements.syncBtn.style.display = "none";
    toggleViewDetails("empty");
    return;
  }

  switch (currentPage) {
    case CONFIGURED_PAGES.all:
      toggleViewDetails("all");
      break;
    case CONFIGURED_PAGES.unique:
      toggleViewDetails("unique");
      break;
  }

  let sameSession;
  try {
    sameSession = await chrome.tabs.sendMessage(currentTabId, {
      action: "verify-same-session",
      data: { extension_no_agente: authRes.data.no_agente },
    });
  } catch (_) {
    /* page might not have content script */
  }

  if (!sameSession?.success) {
    elements.syncMessageLabel.style.display = "flex";
    elements.syncMessageLabel.innerText =
      "La sesión activa en la extensión no coincide con la sesión de la página. Por favor, verifique que está utilizando la misma cuenta en ambos lugares.";
    elements.syncBtn.style.display = "none";
    toggleViewDetails("empty");
  }
}

function handleLogout() {
  alertModal.show(
    "Cierre de sesión",
    "Esta por cerrar la sesión actual, desea continuar?",
    async () => {
      const res = await chrome.runtime.sendMessage({
        action: "exec-delete-session",
      });
      if (res.success) changeViewFn("authentication__signin");
    },
  );
}

async function handleSync(event) {
  event.preventDefault();

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const actionMode = elements.syncBtn.getAttribute("data-action-mode");

  try {
    if (actionMode === "unique") {
      await handleSyncUnique(tab);
    } else if (actionMode === "all") {
      await handleSyncAll(tab);
    }
  } catch (error) {
    alertModal.show("Error", `Existe un error: ${error.message}`);
  }
}

async function handleSyncUnique(tab) {
  alertModal.show(
    "Carga de registros",
    `Se va a realizar la carga del registro ${globalPolizaNum}. Continuar?`,
    async () => {
      const res = await chrome.tabs.sendMessage(tab.id, {
        action: "scrapping-unique",
        tab: tab.id,
      });

      if (!res.success) {
        alertModal.show(
          "Conflicto en la solicitud",
          `${res.message}. Desea sincronizar registro?`,
        );
        return;
      }

      toggleViewDetails("unique");
      elements.syncMessageLabel.style.display = "none";
      elements.syncDetailsRows.style.display = "flex";

      const polizaGet = await chrome.runtime.sendMessage({
        action: "get-unique-in-db",
        data: { num_poliza: res.payload.num_poliza },
      });

      if (!polizaGet.success) throw new Error(polizaGet.message);

      elements.detailNumPoliza.innerText = polizaGet.payload.num_poliza;
      elements.detailNextPayment.innerText = formatDateDisplay(
        new Date(polizaGet.payload.next_payment),
      );
      elements.detailPeriod.innerText = polizaGet.payload.forma_pago;

      alertModal.show("Confirmación de registro", res.message);
    },
  );
}

async function handleSyncAll(tab) {
  const resDb = await chrome.runtime.sendMessage({ action: "get-all-in-db" });
  const inDbData = resDb.data.polizas;

  const resView = await chrome.tabs.sendMessage(tab.id, {
    action: "get-all-in-view-detailed",
  });
  const inViewData = resView.data.polizas;

  const comparedList = filterNewPolizas(inViewData, inDbData);

  if (comparedList.length === 0) {
    alertModal.show(
      "Sincronización de registros",
      "No se han encontrado registros nuevos para sincronizar",
    );
    return;
  }

  alertModal.show(
    "Confirmación de carga de registros",
    `Se hará carga de ${comparedList.length} registro(s) a la base de datos. Desea continuar?`,
    async () => {
      const res = await chrome.tabs.sendMessage(tab.id, {
        action: "post-all",
        tab: tab.id,
      });
      if (!res.success) {
        alertModal.show("Conflicto en la solicitud", res.message);
      }
    },
  );
}

async function toggleViewDetails(submitType) {
  document.querySelectorAll("[data-submit-type]").forEach((el) => {
    el.style.display = "none";
    if (el.getAttribute("data-submit-type") === submitType) {
      el.style.display = "flex";
    }
  });

  switch (submitType) {
    case "all":
      elements.syncBtn.innerText = "Sincronizar registros";
      elements.syncBtn.setAttribute("data-action-mode", "all");
      elements.syncBtn.removeAttribute("disabled");

      try {
        const resView = await chrome.tabs.sendMessage(currentTabId, {
          action: "get-all-in-view",
        });
        if (resView.success) {
          elements.regTotalCount.innerText =
            resView.data?.polizas_count ?? 0;
        }

        const resDb = await chrome.runtime.sendMessage({
          action: "get-all-in-db",
        });
        const inDbData = resDb.data.polizas;

        const resViewDetailed = await chrome.tabs.sendMessage(currentTabId, {
          action: "get-all-in-view-detailed",
        });
        const inViewData = resViewDetailed.data.polizas;

        elements.regNoLoadedCount.innerText = filterNewPolizas(
          inViewData,
          inDbData,
        ).length;
      } catch (_) {
        /* content script might not be loaded */
      }
      break;

    case "unique":
      elements.syncBtn.style.display = "none";

      try {
        const captureRes = await chrome.tabs.sendMessage(currentTabId, {
          action: "get-unique-in-view",
        });

        if (!captureRes.success) {
          throw new Error("No se han podido capturar datos de poliza");
        }

        globalPolizaNum = captureRes.data.num_poliza;

        const authRes = await chrome.runtime.sendMessage({
          action: "verify-session",
        });

        if (!authRes.success) {
          changeViewFn("authentication__signin");
          return;
        }

        const sameSession = await chrome.tabs.sendMessage(currentTabId, {
          action: "verify-same-session",
          data: { extension_no_agente: authRes.data.no_agente },
        });

        if (!sameSession.success) {
          elements.syncBtn.style.display = "none";
          throw new Error(
            "La sesión activa en la extensión no coincide con la sesión de la página.",
          );
        }

        const polizaGet = await chrome.runtime.sendMessage({
          action: "get-unique-in-db",
          data: { num_poliza: captureRes.data.num_poliza },
        });

        if (!polizaGet.success) {
          throw new Error(
            "No existen datos de la poliza en la vista actual. Se recomienda sincronizar el registro.",
          );
        }

        elements.detailNumPoliza.innerText = polizaGet.payload.num_poliza;
        elements.detailNextPayment.innerText = formatDateDisplay(
          new Date(polizaGet.payload.next_payment),
        );
        elements.detailPeriod.innerText = polizaGet.payload.forma_pago;

        elements.syncMessageLabel.style.display = "none";
        elements.syncDetailsRows.style.display = "flex";
      } catch (error) {
        toggleViewDetails("empty");
        elements.syncMessageLabel.style.display = "flex";
        elements.syncDetailsRows.style.display = "none";
        elements.syncMessageLabel.innerText = error.message;
      }
      break;
  }
}
