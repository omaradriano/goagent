export function filterNewPolizas(viewList, dbList, key = null) {
  const dbSet = new Set(
    dbList.map((value) => (typeof value === "string" ? value.trim() : value)),
  );
  return viewList.filter((item) => {
    const rawValue = key ? item[key] : item;
    const value =
      typeof rawValue === "string" ? rawValue.trim() : rawValue;
    return !dbSet.has(value);
  });
}
