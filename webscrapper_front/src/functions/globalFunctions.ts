// El backend manda fechas "de calendario" (sin hora significativa) como
// medianoche UTC (ej. "2026-02-10T00:00:00Z"). Si se leen con los getters
// locales (getDate/getMonth/etc.) en un navegador con zona horaria detrás de
// UTC, el dia cae al anterior. Por eso aqui siempre se ancla al dia de
// calendario en UTC y se reconstruye como medianoche LOCAL para poder
// comparar contra "hoy" (que si es genuinamente hora local del usuario).
function localMidnightFromUtcDate(dateString: string): Date {
  const raw = new Date(dateString);
  return new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
}

export function calculateDaysUntilLimit(limitDate: string): number {
  const limit = localMidnightFromUtcDate(limitDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffInMs = limit.getTime() - today.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return Math.floor(diffInDays);
}

export function formatDate(date: string): string {
  const dateObject = new Date(date);

  // Se usan los getters UTC porque estas fechas viajan como medianoche UTC
  // representando un dia de calendario, no un instante especifico.
  const day = dateObject.getUTCDate().toString().padStart(2, "0");
  const month = (dateObject.getUTCMonth() + 1).toString().padStart(2, "0"); // +1 es vital
  const year = dateObject.getUTCFullYear();

  return `${day} - ${month} - ${year}`;
}

export function calculateDaysRemaining(nextPayment: string): number {
  const target = localMidnightFromUtcDate(nextPayment);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffInMs = target.getTime() - today.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Usamos Math.round para absorber desfases por cambios de horario
  return Math.round(diffInDays);
}
