-- Los pagos manuales y el cambio manual de dia_cobro/forma_pago ya no existen:
-- next_payment se calcula solo en la sincronizacion (recibo pendiente, o
-- fn__set_next_payment desde fecha_emision cuando no hay pendientes). Se
-- eliminan polizas_payments_log (sin filas) y los triggers que dependian de
-- esos flujos. fn__set_next_payment y trg_after_insert se conservan (alta).

DROP TRIGGER IF EXISTS trg_after_insert_poliza_payment ON public.polizas_payments_log;
DROP TRIGGER IF EXISTS trg_before_insert_poliza_payment ON public.polizas_payments_log;
DROP TRIGGER IF EXISTS trg_after_update_dia_cobro ON public.polizas;
DROP TRIGGER IF EXISTS trg_after_update_forma_pago ON public.polizas;

DROP FUNCTION IF EXISTS public.fn__after_insert_poliza_payment();
DROP FUNCTION IF EXISTS public.fn___before_insert_poliza_payment();
DROP FUNCTION IF EXISTS public.fn_trigger_after_update_dia_cobro();
DROP FUNCTION IF EXISTS public.fn_trigger_after_update_forma_pago();
DROP FUNCTION IF EXISTS public.fn_trigger_update_next_payment();

CREATE OR REPLACE PROCEDURE public.cleanuser(IN p_no_agente character varying)
LANGUAGE plpgsql AS $$
DECLARE
    v_agente_id INTEGER;
    v_polizas_count INTEGER;
    v_payments_conf_count INTEGER;
    v_asegurados_count INTEGER;
    v_flexible_pagos_count INTEGER;
    v_flexible_anualidad_count INTEGER;
    v_audit_log_count INTEGER;
BEGIN
    SELECT agente_id INTO v_agente_id FROM agentes WHERE no_agente = p_no_agente;
    IF v_agente_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro agente con no_agente: %', p_no_agente;
    END IF;
    DELETE FROM polizas_audit_log WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_audit_log_count = ROW_COUNT;
    DELETE FROM polizas_payments_conf WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_payments_conf_count = ROW_COUNT;
    DELETE FROM polizas_flexible_pagos WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_flexible_pagos_count = ROW_COUNT;
    DELETE FROM polizas_flexible_anualidad WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_flexible_anualidad_count = ROW_COUNT;
    DELETE FROM asegurados WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_asegurados_count = ROW_COUNT;
    DELETE FROM polizas WHERE agente_id = v_agente_id;
    GET DIAGNOSTICS v_polizas_count = ROW_COUNT;
    RAISE NOTICE 'CleanUser completado para agente % (id: %)', p_no_agente, v_agente_id;
    RAISE NOTICE 'Eliminados: % polizas, % asegurados, % payments_conf, % flexible_anualidad, % flexible_pagos, % audit_log',
        v_polizas_count, v_asegurados_count, v_payments_conf_count,
        v_flexible_anualidad_count, v_flexible_pagos_count, v_audit_log_count;
END;
$$;

DROP TABLE IF EXISTS public.polizas_payments_log;
