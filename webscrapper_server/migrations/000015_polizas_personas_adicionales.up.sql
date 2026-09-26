-- Personas adicionales por poliza: familiares de los asegurados que NO estan
-- en el seguro, registrados solo para recordar su cumpleanos. Tabla aparte de
-- asegurados porque el sync de la extension reemplaza por completo los
-- asegurados de la poliza (ReplaceByPolizaID); esta tabla nunca la toca.
--
-- Del cumpleanos solo importan dia y mes: se guarda como date con el ano fijo
-- 2000 (bisiesto, para aceptar el 29 de febrero).

CREATE TABLE IF NOT EXISTS public.polizas_personas_adicionales (
    persona_id      serial PRIMARY KEY,
    poliza_id       bigint  NOT NULL REFERENCES public.polizas(poliza_id) ON DELETE CASCADE,
    agente_id       integer NOT NULL REFERENCES public.agentes(agente_id),
    nombre_completo varchar(150) NOT NULL CHECK (length(btrim(nombre_completo)) > 0),
    birthday        date    NOT NULL CHECK (EXTRACT(YEAR FROM birthday) = 2000),
    parentesco      varchar(20) NOT NULL
                    CHECK (parentesco IN ('conyuge', 'hijo', 'padre_madre', 'otro')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_polizas_personas_adicionales_poliza
    ON public.polizas_personas_adicionales (poliza_id);
