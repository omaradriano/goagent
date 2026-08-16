export function filterNewPolizas(viewList, dbList, key = null) {
  const dbSet = new Set(dbList);
  return viewList.filter((item) => {
    const value = key ? item[key] : item;
    return !dbSet.has(value);
  });
}
