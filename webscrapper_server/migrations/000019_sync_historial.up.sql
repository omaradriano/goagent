-- Historial de sincronizaciones: cada sync de la extension (cartera completa,
-- parcial o una sola poliza) es un sync_run, y lo que cambio en el (pago
-- detectado = next_payment avanzo, cambio de estatus, alta) un sync_evento.
-- Asi el dashboard puede mostrar QUE polizas cambiaron, no solo los totales.

CREATE TABLE IF NOT EXISTS public.sync_runs (
    sync_id            serial PRIMARY KEY,
    agente_id          integer NOT NULL REFERENCES public.agentes(agente_id),
    tipo               varchar(12) NOT NULL CHECK (tipo IN ('parcial', 'completa', 'individual')),
    estado             varchar(12) NOT NULL DEFAULT 'en_curso'
                       CHECK (estado IN ('en_curso', 'completada', 'interrumpida', 'detenida')),
    started_at         timestamptz NOT NULL DEFAULT now(),
    finished_at        timestamptz,
    -- Contador "Por vencer" del dashboard al iniciar y al terminar.
    por_vencer_antes   integer,
    por_vencer_despues integer
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_agente
    ON public.sync_runs (agente_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.sync_eventos (
    evento_id      serial PRIMARY KEY,
    -- NULL: cambio enviado por una version de la extension sin sync_runs.
    sync_id        integer REFERENCES public.sync_runs(sync_id) ON DELETE CASCADE,
    agente_id      integer NOT NULL REFERENCES public.agentes(agente_id),
    poliza_id      bigint  NOT NULL REFERENCES public.polizas(poliza_id) ON DELETE CASCADE,
    tipo           varchar(10) NOT NULL CHECK (tipo IN ('pago', 'estatus', 'alta')),
    valor_anterior text,
    valor_nuevo    text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_eventos_run ON public.sync_eventos (agente_id, sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_eventos_poliza ON public.sync_eventos (poliza_id);
