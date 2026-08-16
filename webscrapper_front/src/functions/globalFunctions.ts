export function calculateDaysUntilLimit(limitDate: string): number {
  const limit = new Date(limitDate);
  const today = new Date();

  // 1. Normalizar ambas fechas a "medianoche" para que la hora no afecte el cálculo
  limit.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // 2. Obtener la diferencia en milisegundos
  const diffInMs = limit.getTime() - today.getTime();

  // 3. Convertir milisegundos a días: (ms / 1000 / 60 / 60 / 24)
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return Math.floor(diffInDays);
}

export function formatDate(date: string): string {
  const dateObject = new Date(date);

  // Obtenemos los valores
  const day = dateObject.getDate().toString().padStart(2, "0");
  const month = (dateObject.getMonth() + 1).toString().padStart(2, "0"); // +1 es vital
  const year = dateObject.getFullYear();

  return `${day} - ${month} - ${year}`;
}

export function calculateDaysRemaining(nextPayment: string): number {
  // 1. La fecha del próximo pago (viniendo de la DB)
  const target = new Date(nextPayment);

  // 2. La fecha actual (hoy)
  const today = new Date();

  // 3. Normalizamos ambas a medianoche (00:00:00)
  // Esto es CRUCIAL para que si hoy es 24 y el pago es el 25,
  // la resta sea de 1 día exacto sin importar la hora actual.
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // 4. Diferencia en milisegundos
  const diffInMs = target.getTime() - today.getTime();

  // 5. Conversión a días
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Usamos Math.round para absorber desfases por cambios de horario
  return Math.round(diffInDays);
}
