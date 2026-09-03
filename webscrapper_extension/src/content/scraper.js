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
  if (btn.value === "Histórico de Aportaciones") {
    btn.click();
    return "historicoaportaciones";
  }
  return null;
}

// Lee la tabla de anualidades (GridPeriodos), incluyendo el "postback
// target" de cada link "Ver detalle de anualidad" (extraido del href
// javascript:__doPostBack('target','')) para que el background pueda
// disparar ese postback directamente con __doPostBack en vez de simular un
// click sobre el link.
export function getFlexibleAnualidades() {
  const periodoRows = Array.from(
    document.querySelectorAll(
      "#ctl00_ContentPlaceHolder1_GridPeriodos > tbody > tr.GridRow",
    ),
  );
  if (periodoRows.length === 0) {
    return { success: false, periodos: [] };
  }

  const periodos = periodoRows
    .map((row) => {
      // Los indices se toman de los <td> hijos directos de la fila (no via
      // querySelector con :nth-child, que se evalua relativo al padre real
      // de cada elemento en todo el documento, no relativo a "row").
      const cells = Array.from(row.querySelectorAll(":scope > td"));
      const desde = cells[2]?.innerText.trim();
      const hasta = cells[3]?.innerText.trim();
      const primaBasicaRaw = cells[4]?.innerText.trim();
      const link = row.querySelector("a.ligas");
      const hrefMatch = link
        ?.getAttribute("href")
        ?.match(/__doPostBack\('([^']+)'/);
      return {
        postbackTarget: hrefMatch ? hrefMatch[1] : null,
        desde: desde ? formatDateSlash(desde) : null,
        hasta: hasta ? formatDateSlash(hasta) : null,
        prima_basica_udis: primaBasicaRaw
          ? parseFloat(primaBasicaRaw.replace(/,/g, "")) || 0
          : 0,
      };
    })
    .filter((p) => p.desde && p.hasta && p.postbackTarget);

  return { success: periodos.length > 0, periodos };
}

const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Lee los pagos (Importe UDI) de la anualidad actualmente desplegada en
// GridIngresos. Dos cuidados clave con esta tabla:
// 1. Se acota a "> tbody > tr.GridRow" (hijos directos) porque cada fila de
//    pago trae anidada una tabla "ChildGrid" con su propio tr.GridRow para
//    el detalle de deducibles - sin acotar, esas filas anidadas tambien
//    caen en el querySelectorAll y corrompen la lectura.
// 2. Los <td> de cada fila se toman como arreglo de hijos directos
//    (":scope > td") y se indexan por posicion en JS, NUNCA con
//    row.querySelector("td:nth-last-child(N)") - ese pseudo-selector se
//    evalua relativo al padre REAL de cada <td> en todo el documento, asi
//    que dentro de una fila con tabla anidada (ChildGrid), querySelector
//    encuentra primero una celda de la tabla anidada que tambien cumple
//    nth-last-child(N) relativo a SU propio padre, en vez de la celda real
//    de la fila externa.
// 3. La primera columna (icono "+" para expandir el deducible) SOLO existe
//    en filas que tienen un deducible asociado - en filas sin deducible esa
//    columna no se renderiza y todo se recorre una posicion. Por eso se
//    indexa contando desde el final del arreglo de celdas, que es
//    invariante a si esa columna existe o no.
export function getFlexiblePagos() {
  const table = document.getElementById("ctl00_ContentPlaceHolder1_GridIngresos");
  const pagoRows = table
    ? Array.from(table.querySelectorAll(":scope > tbody > tr.GridRow"))
    : [];

  const crudo = pagoRows.map((row) => {
    const cells = Array.from(row.querySelectorAll(":scope > td"));
    const fechaRaw = cells[cells.length - 8]?.innerText.trim();
    const importeRaw = cells[cells.length - 4]?.innerText.trim();
    return {
      fecha: fechaRaw ? formatDateSlash(fechaRaw) : null,
      importe_udi: importeRaw
        ? parseFloat(importeRaw.replace(/,/g, "")) || 0
        : 0,
    };
  });

  const pagos = crudo.filter((p) => p.fecha && FECHA_ISO_REGEX.test(p.fecha));

  return {
    success: true,
    pagos,
    debug: {
      url: location.href,
      tablaEncontrada: !!table,
      filasEncontradas: pagoRows.length,
      crudo,
    },
  };
}

export function getPageAgentNumber() {
  return document
    .getElementById("ctl00_LbIdAgente")
    ?.innerText.split(":")[1]
    ?.trim();
}
