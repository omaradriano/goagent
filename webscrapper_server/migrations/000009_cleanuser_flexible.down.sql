-- Revierte CleanUser a la version sin datos de polizas flexibles

CREATE OR REPLACE PROCEDURE public.cleanuser(IN p_no_agente character varying)
LANGUAGE plpgsql AS $$
DECLARE
    v_agente_id INTEGER;
    v_polizas_count INTEGER;
    v_payments_log_count INTEGER;
    v_payments_conf_count INTEGER;
    v_asegurados_count INTEGER;
BEGIN
    SELECT agente_id INTO v_agente_id FROM agentes WHERE no_agente = p_no_agente;
    IF v_agente_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro agente con no_agente: %', p_no_agente;
    END IF;
    DELETE FROM polizas_payments_log WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_payments_log_count = ROW_COUNT;
    DELETE FROM polizas_payments_conf WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_payments_conf_count = ROW_COUNT;
    DELETE FROM asegurados WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_asegurados_count = ROW_COUNT;
    DELETE FROM polizas WHERE agente_id = v_agente_id;
    GET DIAGNOSTICS v_polizas_count = ROW_COUNT;
    RAISE NOTICE 'CleanUser completado para agente % (id: %)', p_no_agente, v_agente_id;
    RAISE NOTICE 'Eliminados: % polizas, % asegurados, % payments_conf, % payments_log',
        v_polizas_count, v_asegurados_count, v_payments_conf_count, v_payments_log_count;
END;
$$;
