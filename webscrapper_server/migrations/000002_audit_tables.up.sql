CREATE TABLE IF NOT EXISTS public.polizas_audit_log (
    audit_id serial PRIMARY KEY,
    poliza_id integer NOT NULL REFERENCES public.polizas(poliza_id),
    field_name character varying(64) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer REFERENCES public.agentes(agente_id),
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(32) DEFAULT 'api' NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agentes_audit_log (
    audit_id serial PRIMARY KEY,
    agente_id integer NOT NULL REFERENCES public.agentes(agente_id),
    field_name character varying(64) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer REFERENCES public.agentes(agente_id),
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(32) DEFAULT 'api' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_polizas_audit_poliza ON public.polizas_audit_log(poliza_id);
CREATE INDEX IF NOT EXISTS idx_agentes_audit_agente ON public.agentes_audit_log(agente_id);
