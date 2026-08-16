// DD/MM/YYYY -> YYYY-MM-DD
export function formatDateSlash(d) {
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
}

// DD-MM-YYYY -> YYYY-MM-DD
export function formatDateDash(d) {
  const [day, month, year] = d.split("-");
  return `${year}-${month}-${day}`;
}

// Date object -> DD-MM-YYYY
export function formatDateDisplay(d) {
  if (!(d instanceof Date) || isNaN(d)) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}
