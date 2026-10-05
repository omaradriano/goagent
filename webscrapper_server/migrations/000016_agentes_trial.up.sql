-- Prueba gratis sin tarjeta: el acceso es is_subscribed (pago en Stripe) O
-- trial_ends_at en el futuro. NULL = el agente nunca ha usado su prueba; una
-- vez puesta la fecha no se borra, asi la prueba es una sola vez por agente.
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
