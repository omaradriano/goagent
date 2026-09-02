import { formatDateSlash, formatDateDash } from "../shared/dates.js";

export function capturePolizaDetails() {
  const getText = (id) => document.getElementById(id)?.innerText;
  const getQuery = (sel) => document.querySelector(sel)?.innerText;

  const nombresNodes = document.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_TbAsegs td",
  );
  const fechasNodes = document.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_TbBirth td",
  );

  const asegurados = Array.from(nombresNodes).map((elem, index) => {
    const textoNombre = elem.innerText.trim();
    const isPrincipal = textoNombre.includes("*");
    const nombreLimpio = textoNombre.replace("*", "").trim();
    const fechaRaw = fechasNodes[index]?.innerText.trim() || null;

    return {
      nombre: nombreLimpio,
      is_principal: isPrincipal,
      birthday: fechaRaw ? formatDateDash(fechaRaw) : null,
    };
  });

  return {
    num_poliza: getText("ctl00_ContentPlaceHolder1_LbPoliza")?.trim(),
    tipo_seguro: getText("ctl00_ContentPlaceHolder1_lbTSeguro"),
    fecha_emision: formatDateSlash(
      getText("ctl00_ContentPlaceHolder1_lbFInicio"),
    ),
    plan: getText("ctl00_ContentPlaceHolder1_lbDescL"),
    forma_pago: getText("ctl00_ContentPlaceHolder1_lbFPPoliza"),
    estatus: getText("ctl00_ContentPlaceHolder1_lbStatus"),
    medio_cobro: getText("ctl00_ContentPlaceHolder1_lbMCobro"),
    contratante: getText("ctl00_ContentPlaceHolder1_lbNomCont"),
    dia_cobro: Number(getText("ctl00_ContentPlaceHolder1_lbDiaCobro")),
    moneda: getQuery("#ctl00_ContentPlaceHolder1_lbMoneda"),
    pais: getQuery("#ctl00_ContentPlaceHolder1_lbPais"),
    email: getQuery("#ctl00_ContentPlaceHolder1_lbPolMail"),
    telefono: getQuery("#ctl00_ContentPlaceHolder1_lbAgeTelTrab"),
    asegurados,
    suma_asegurada: getQuery("#ctl00_ContentPlaceHolder1_lbSA"),
    direccion: {
      calle: getQuery("#ctl00_ContentPlaceHolder1_lbCalle"),
      colonia: getQuery("#ctl00_ContentPlaceHolder1_lbCol"),
      ciudad: getQuery("#ctl00_ContentPlaceHolder1_lbCdMun"),
      estado: getQuery("#ctl00_ContentPlaceHolder1_lbEdo"),
      codigo_postal: getQuery("#ctl00_ContentPlaceHolder1_lbCP"),
    },
  };
}

export function getPolizasList() {
  const enlaces = document.querySelectorAll("a.ligas[id*='lnkPoliza']");
  return Array.from(enlaces)
    .map((a) => {
      const href = a.getAttribute("href");
      const match = href.match(/'([^']+)'/);
      return {
        idPostback: match ? match[1] : null,
        idPoliza: a.innerText.trim(),
      };
    })
    .filter((item) => item.idPostback !== null);
}

export function getPolizasCount() {
  return document.querySelectorAll("a.ligas[id*='lnkPoliza']").length;
}

export function getPolizasIds() {
  const enlaces = document.querySelectorAll("a.ligas[id*='lnkPoliza']");
  return Array.from(enlaces).map((elem) => elem.innerText.trim());
}

export function getPagerInfo() {
  const table = document.getElementById("ctl00_ContentPlaceHolder1_GVPolList");
  if (!table) return { currentPage: 1, nextPage: null, totalPages: 1 };

  const pagerLinks = Array.from(table.querySelectorAll("tr td table a")).filter(
    (a) => /Page\$\d+/.test(a.getAttribute("href") || ""),
  );
  const pagerSpans = Array.from(table.querySelectorAll("tr td table span"));

  let currentPage = 1;
  for (const span of pagerSpans) {
    const num = parseInt(span.textContent.trim(), 10);
    if (!Number.isNaN(num)) {
      currentPage = num;
      break;
    }
  }

  let nextPage = null;
  let totalPages = currentPage;
  for (const a of pagerLinks) {
    const match = a.getAttribute("href").match(/Page\$(\d+)/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (num > currentPage && (nextPage === null || num < nextPage)) {
      nextPage = num;
    }
    if (num > totalPages) {
      totalPages = num;
    }
  }

  return { currentPage, nextPage, totalPages };
}

export function getLastPendingPaymentDate() {
  const rows = Array.from(
    document.querySelectorAll(
      "#ctl00_ContentPlaceHolder1_GridView1 .GridRow",
    ),
  );

  if (rows.length === 0) {
    return { success: false, last_payment: null };
  }

  const pendingRows = rows.filter((row) => {
    const statusCell = row.querySelector("td:nth-child(25)");
    return statusCell && statusCell.innerText.trim() === "Pendiente";
  });

  if (pendingRows.length === 0) {
    return { success: false, last_payment: null };
  }

  const rowWithMinDate = pendingRows.reduce((minRow, currentRow) => {
    const currentDateCell = currentRow.querySelector("td:nth-child(4)");
    const minDateCell = minRow.querySelector("td:nth-child(4)");
    const currentDate = new Date(
      formatDateSlash(currentDateCell.textContent.trim()),
    );
    const minDate = new Date(formatDateSlash(minDateCell.textContent.trim()));
    return currentDate < minDate ? currentRow : minRow;
  });

  const dateData = rowWithMinDate
    ? rowWithMinDate.querySelector("td:nth-child(4)").textContent.trim()
    : null;

  return {
    success: true,
    last_payment: dateData ? formatDateSlash(dateData) : null,
  };
}

export function getPolizaType() {
  const btn = document.getElementById("ctl00_ContentPlaceHolder1_Button2");
  if (!btn) return null;

  if (btn.value === "Recibos / aportaciones") {
    btn.click();
    return "recibosaportaciones";
  }
  return "historicoaportaciones";
}

export function getPageAgentNumber() {
  return document
    .getElementById("ctl00_LbIdAgente")
    ?.innerText.split(":")[1]
    ?.trim();
}
