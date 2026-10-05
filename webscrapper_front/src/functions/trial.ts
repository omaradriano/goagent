// Prueba gratis sin tarjeta (una sola vez por agente). El backend devuelve
// is_subscribed = true durante la prueba, asi que todo lo que solo revisa
// isSubscribed queda habilitado; esto es para mostrar el estado de la prueba.

export const TRIAL_DAYS = 30;

export interface SubscriptionStatusPayload {
  is_subscribed: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  is_trial?: boolean;
  trial_ends_at?: number;
  trial_available?: boolean;
}

export interface TrialState {
  // Prueba vigente sin suscripcion pagada.
  isTrial: boolean;
  // Nunca la ha usado y no paga: puede iniciarla.
  available: boolean;
  // Fecha de fin ya formateada ("4 de noviembre de 2026").
  endsAt: string | null;
  daysLeft: number;
}

export const EMPTY_TRIAL: TrialState = {
  isTrial: false,
  available: false,
  endsAt: null,
  daysLeft: 0,
};

export const formatUnixDate = (unix: number): string =>
  new Date(unix * 1000).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const trialFromStatus = (p: SubscriptionStatusPayload): TrialState => {
  const endsAt = p.trial_ends_at ?? 0;
  return {
    isTrial: p.is_trial ?? false,
    available: p.trial_available ?? false,
    endsAt: endsAt > 0 ? formatUnixDate(endsAt) : null,
    // Redondeo hacia arriba: con 2 h restantes todavia queda "1 dia".
    daysLeft: endsAt > 0 ? Math.max(0, Math.ceil((endsAt * 1000 - Date.now()) / 86_400_000)) : 0,
  };
};

export const trialDaysLabel = (days: number): string =>
  days === 1 ? "1 día" : `${days} días`;

// Activa la prueba gratis; devuelve el estado de suscripcion actualizado o
// lanza un Error con el mensaje del backend.
export const startTrial = async (): Promise<SubscriptionStatusPayload> => {
  const jwt = localStorage.getItem("session_jwt");
  const res = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/v1/api/start_trial`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "No se pudo activar la prueba gratis.");
  }
  return data.payload;
};
