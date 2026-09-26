-- Bitacora de comentarios por poliza. Reemplaza a polizas.comentario (una
-- sola nota que se sobrescribia): cada comentario es un registro con autor y
-- fecha; no se editan y el borrado es logico (deleted_at). El resync nunca
-- toca esta tabla.

CREATE TABLE IF NOT EXISTS public.polizas_comentarios (
    comentario_id serial PRIMARY KEY,
    poliza_id     bigint  NOT NULL REFERENCES public.polizas(poliza_id) ON DELETE CASCADE,
    agente_id     integer NOT NULL REFERENCES public.agentes(agente_id),
    contenido     text    NOT NULL CHECK (length(btrim(contenido)) BETWEEN 1 AND 2000),
    created_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_polizas_comentarios_poliza
    ON public.polizas_comentarios (poliza_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- El comentario actual de cada poliza pasa a ser la primera entrada de su
-- bitacora. La columna polizas.comentario se conserva por ahora (se elimina
-- en una migracion posterior, cuando ya nada la use).
INSERT INTO public.polizas_comentarios (poliza_id, agente_id, contenido, created_at)
SELECT p.poliza_id, p.agente_id, left(btrim(p.comentario), 2000), COALESCE(p.last_modified, now())
FROM public.polizas p
WHERE btrim(COALESCE(p.comentario, '')) <> ''
  AND p.agente_id IS NOT NULL;
