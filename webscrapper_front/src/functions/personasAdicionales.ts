import type { SelectOption } from "../components/selectMenu";

// Mismos valores que el CHECK de polizas_personas_adicionales.parentesco.
export const PARENTESCOS: SelectOption[] = [
  { value: "conyuge", label: "Esposo(a)" },
  { value: "hijo", label: "Hijo" },
  { value: "padre_madre", label: "Padre/Madre" },
  { value: "otro", label: "Otro" },
];

export const parentescoLabel = (value?: string) =>
  PARENTESCOS.find((p) => p.value === value)?.label ?? "Otro";

export const MESES: SelectOption[] = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre",
].map((m, i) => ({ value: String(i + 1), label: m.charAt(0).toUpperCase() + m.slice(1) }));

// Dias del mes contra un ano bisiesto (igual que el backend): 29 de febrero
// es valido.
export const diasDelMes = (mes: number) => new Date(2000, mes, 0).getDate();

// "26 de septiembre", el formato que usa el resto de la web.
export const formatDiaMes = (dia: number, mes: number) =>
  `${dia} de ${MESES[mes - 1]?.label.toLowerCase() ?? ""}`;
