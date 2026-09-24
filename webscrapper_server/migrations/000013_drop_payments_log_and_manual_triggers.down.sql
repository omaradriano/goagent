-- Restaura polizas_payments_log, sus triggers, los triggers de dia_cobro/forma_pago
-- y cleanuser tal como estaban antes de 000013 (definiciones tomadas de la BD).

CREATE TABLE IF NOT EXISTS public.polizas_payments_log (
    payment_log_id serial PRIMARY KEY,
    last_updated timestamp with time zone DEFAULT now(),
    paid_period timestamp with time zone NOT NULL,
    poliza_id bigint REFERENCES public.polizas(poliza_id),
    agente_id bigint REFERENCES public.agentes(agente_id)
);

CREATE OR REPLACE PROCEDURE public.cleanuser(IN p_no_agente character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_agente_id INTEGER;
    v_polizas_count INTEGER;
    v_payments_log_count INTEGER;
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
    DELETE FROM polizas_payments_log WHERE poliza_id IN (SELECT poliza_id FROM polizas WHERE agente_id = v_agente_id);
    GET DIAGNOSTICS v_payments_log_count = ROW_COUNT;
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
    RAISE NOTICE 'Eliminados: % polizas, % asegurados, % payments_conf, % payments_log, % flexible_anualidad, % flexible_pagos, % audit_log',
        v_polizas_count, v_asegurados_count, v_payments_conf_count, v_payments_log_count,
        v_flexible_anualidad_count, v_flexible_pagos_count, v_audit_log_count;
END;
$procedure$
;

CREATE OR REPLACE FUNCTION public.fn___before_insert_poliza_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vMinAllowed DATE;
    vProximoVencimiento TIMESTAMPTZ;
    vExistePagoPrevio TIMESTAMPTZ;
BEGIN
    SELECT paid_period INTO vExistePagoPrevio
    FROM polizas_payments_log WHERE poliza_id = NEW.poliza_id;

    SELECT next_payment INTO vProximoVencimiento
    FROM polizas_payments_conf WHERE poliza_id = NEW.poliza_id;

    IF vExistePagoPrevio IS NULL THEN
        RETURN NEW;
    END IF;

    vMinAllowed := (vProximoVencimiento - INTERVAL '5 days')::DATE;

    IF CURRENT_DATE >= vMinAllowed THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'PAGO BLOQUEADO: Aun no se puede cobrar (Inicia cobro: %)', vMinAllowed;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn__after_insert_poliza_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vFormaPago       polizas.forma_pago%TYPE;
    vFechaEmision    polizas.fecha_emision%TYPE;
    vDiaCobroPoliza  polizas.dia_cobro%TYPE;
    vDiaEmision      INT;
    vInterval        INTERVAL;
    vEmision_mx      DATE;
    vDiasEnMes       INT;
    vNextPaymentDate TIMESTAMPTZ;
    vRefDate_mx      DATE;
    vFloorDate_mx    DATE;
    vDiaCobro        INT;
    vFechaCobro      TIMESTAMPTZ;
    vDiaSemana       INT;
BEGIN
    SELECT forma_pago, fecha_emision, dia_cobro
    INTO vFormaPago, vFechaEmision, vDiaCobroPoliza
    FROM polizas WHERE poliza_id = NEW.poliza_id;

    IF vFormaPago IS NULL THEN
        RAISE EXCEPTION 'ERROR en fn__after_insert_poliza_payment: No se encontro la poliza ID %', NEW.poliza_id;
    END IF;

    IF vDiaCobroPoliza = 0 THEN
        vDiaEmision := EXTRACT(DAY FROM (vFechaEmision AT TIME ZONE 'America/Mexico_City'))::int;
    ELSE
        vDiaEmision := vDiaCobroPoliza;
    END IF;

    vInterval := CASE
        WHEN vFormaPago = 'MENSUAL' THEN INTERVAL '1 month'
        WHEN vFormaPago = 'TRIMESTRAL' THEN INTERVAL '3 months'
        WHEN vFormaPago = 'SEMESTRAL' THEN INTERVAL '6 months'
        WHEN vFormaPago = 'ANUAL' THEN INTERVAL '12 months'
        ELSE INTERVAL '1 month' END;

    vEmision_mx := (vFechaEmision AT TIME ZONE 'America/Mexico_City')::date;
    vDiasEnMes := EXTRACT(DAY FROM (DATE_TRUNC('month', vEmision_mx) + INTERVAL '1 month - 1 day'))::int;
    vNextPaymentDate := make_timestamptz(
        EXTRACT(YEAR FROM vEmision_mx)::int,
        EXTRACT(MONTH FROM vEmision_mx)::int,
        LEAST(vDiaEmision, vDiasEnMes),
        0, 0, 0, 'America/Mexico_City');

    vRefDate_mx := (NEW.paid_period AT TIME ZONE 'America/Mexico_City')::date;

    LOOP
        EXIT WHEN (vNextPaymentDate AT TIME ZONE 'America/Mexico_City')::date > vRefDate_mx;
        vNextPaymentDate := vNextPaymentDate + vInterval;
    END LOOP;

    vFloorDate_mx := (vNextPaymentDate AT TIME ZONE 'America/Mexico_City')::date;
    vDiasEnMes := EXTRACT(DAY FROM (DATE_TRUNC('month', vFloorDate_mx) + INTERVAL '1 month - 1 day'))::int;
    vDiaCobro := LEAST(vDiaEmision, vDiasEnMes);
    vFechaCobro := make_timestamptz(
        EXTRACT(YEAR FROM vFloorDate_mx)::int,
        EXTRACT(MONTH FROM vFloorDate_mx)::int,
        vDiaCobro, 0, 0, 0, 'America/Mexico_City');

    vDiaSemana := EXTRACT(DOW FROM vFechaCobro)::int;
    IF vDiaSemana = 6 THEN vFechaCobro := vFechaCobro + INTERVAL '2 days';
    ELSIF vDiaSemana = 0 THEN vFechaCobro := vFechaCobro + INTERVAL '1 day'; END IF;

    UPDATE polizas_payments_conf SET next_payment = vFechaCobro WHERE poliza_id = NEW.poliza_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_trigger_after_update_dia_cobro()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vNextPayment      TIMESTAMPTZ;
    vNextPaymentLocal TIMESTAMP;
    vDiaCobro         INT;
    vOldDiaCobro      INT;
    vDiaActual        INT;
    vDowActual        INT;
    vBaseMonth        DATE;
    vDiasEnMes        INT;
    vFechaCobro       TIMESTAMPTZ;
    vDiaSemana        INT;
BEGIN
    IF NEW.tipo_poliza = 'FLEXIBLE' THEN
        RETURN NEW;
    END IF;

    SELECT ppc.next_payment INTO vNextPayment
    FROM polizas_payments_conf ppc WHERE ppc.poliza_id = NEW.poliza_id;

    IF vNextPayment IS NULL THEN RETURN NEW; END IF;

    IF NEW.dia_cobro = 0 THEN
        vDiaCobro := EXTRACT(DAY FROM (NEW.fecha_emision AT TIME ZONE 'America/Mexico_City'))::int;
    ELSE
        vDiaCobro := NEW.dia_cobro;
    END IF;

    vNextPaymentLocal := vNextPayment AT TIME ZONE 'America/Mexico_City';
    vDiaActual := EXTRACT(DAY FROM vNextPaymentLocal)::int;
    vDowActual := EXTRACT(DOW FROM vNextPaymentLocal)::int;
    vOldDiaCobro := CASE WHEN OLD.dia_cobro = 0
        THEN EXTRACT(DAY FROM (NEW.fecha_emision AT TIME ZONE 'America/Mexico_City'))::int
        ELSE OLD.dia_cobro END;

    IF vDowActual = 1 AND vDiaActual <= 2 AND vOldDiaCobro >= 28 THEN
        vBaseMonth := (DATE_TRUNC('month', vNextPaymentLocal::date) - INTERVAL '1 month')::date;
    ELSE
        vBaseMonth := DATE_TRUNC('month', vNextPaymentLocal::date)::date;
    END IF;

    vDiasEnMes := EXTRACT(DAY FROM (vBaseMonth + INTERVAL '1 month - 1 day'))::int;
    vDiaCobro := LEAST(vDiaCobro, vDiasEnMes);
    vFechaCobro := make_timestamptz(
        EXTRACT(YEAR FROM vBaseMonth)::int,
        EXTRACT(MONTH FROM vBaseMonth)::int,
        vDiaCobro, 0, 0, 0, 'America/Mexico_City'
    );

    vDiaSemana := EXTRACT(DOW FROM vFechaCobro)::int;
    IF vDiaSemana = 6 THEN
        vFechaCobro := vFechaCobro + INTERVAL '2 days';
    ELSIF vDiaSemana = 0 THEN
        vFechaCobro := vFechaCobro + INTERVAL '1 day';
    END IF;

    UPDATE polizas_payments_conf SET next_payment = vFechaCobro WHERE poliza_id = NEW.poliza_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_trigger_after_update_forma_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    vLastPaidPeriod    TIMESTAMPTZ;
    vRefDate           DATE;
    vDiaEmision        INT;
    vInterval          INTERVAL;
    vNextPaymentDate   TIMESTAMPTZ;
    vFloorDate_mx      DATE;
    vDiasEnMes         INT;
    vDiaCobro          INT;
    vFechaCobro        TIMESTAMPTZ;
    vDiaSemana         INT;
    vEmision_mx        DATE;
BEGIN
    IF NEW.tipo_poliza = 'FLEXIBLE' THEN
        RETURN NEW;
    END IF;

    IF NEW.dia_cobro = 0 THEN
        vDiaEmision := EXTRACT(DAY FROM (NEW.fecha_emision AT TIME ZONE 'America/Mexico_City'))::int;
    ELSE vDiaEmision := NEW.dia_cobro; END IF;

    vInterval := CASE
        WHEN NEW.forma_pago = 'MENSUAL' THEN INTERVAL '1 month'
        WHEN NEW.forma_pago = 'TRIMESTRAL' THEN INTERVAL '3 months'
        WHEN NEW.forma_pago = 'SEMESTRAL' THEN INTERVAL '6 months'
        WHEN NEW.forma_pago = 'ANUAL' THEN INTERVAL '12 months'
        ELSE INTERVAL '1 month' END;

    vEmision_mx := (NEW.fecha_emision AT TIME ZONE 'America/Mexico_City')::date;
    vDiasEnMes := EXTRACT(DAY FROM (DATE_TRUNC('month', vEmision_mx) + INTERVAL '1 month - 1 day'))::int;
    vNextPaymentDate := make_timestamptz(
        EXTRACT(YEAR FROM vEmision_mx)::int,
        EXTRACT(MONTH FROM vEmision_mx)::int,
        LEAST(vDiaEmision, vDiasEnMes),
        0, 0, 0, 'America/Mexico_City');

    SELECT paid_period INTO vLastPaidPeriod
    FROM polizas_payments_log WHERE poliza_id = NEW.poliza_id
    ORDER BY payment_log_id DESC LIMIT 1;

    IF vLastPaidPeriod IS NOT NULL THEN
        vRefDate := (vLastPaidPeriod AT TIME ZONE 'America/Mexico_City')::date;
    ELSE
        vRefDate := (NOW() AT TIME ZONE 'America/Mexico_City')::date;
    END IF;

    LOOP
        EXIT WHEN (vNextPaymentDate AT TIME ZONE 'America/Mexico_City')::date > vRefDate;
        vNextPaymentDate := vNextPaymentDate + vInterval;
    END LOOP;

    vFloorDate_mx := (vNextPaymentDate AT TIME ZONE 'America/Mexico_City')::date;
    vDiasEnMes := EXTRACT(DAY FROM (DATE_TRUNC('month', vFloorDate_mx) + INTERVAL '1 month - 1 day'))::int;
    vDiaCobro := LEAST(vDiaEmision, vDiasEnMes);
    vFechaCobro := make_timestamptz(
        EXTRACT(YEAR FROM vFloorDate_mx)::int,
        EXTRACT(MONTH FROM vFloorDate_mx)::int,
        vDiaCobro, 0, 0, 0, 'America/Mexico_City');

    vDiaSemana := EXTRACT(DOW FROM vFechaCobro)::int;
    IF vDiaSemana = 6 THEN vFechaCobro := vFechaCobro + INTERVAL '2 days';
    ELSIF vDiaSemana = 0 THEN vFechaCobro := vFechaCobro + INTERVAL '1 day'; END IF;

    UPDATE polizas_payments_conf SET next_payment = vFechaCobro WHERE poliza_id = NEW.poliza_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_trigger_update_next_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    CALL fn__set_next_payment(OLD.poliza_uuid, NEW.next_payment);
    RETURN NEW;
END;
$function$
;

CREATE TRIGGER trg_after_insert_poliza_payment AFTER INSERT ON public.polizas_payments_log FOR EACH ROW EXECUTE FUNCTION fn__after_insert_poliza_payment();
CREATE TRIGGER trg_before_insert_poliza_payment BEFORE INSERT ON public.polizas_payments_log FOR EACH ROW EXECUTE FUNCTION fn___before_insert_poliza_payment();
CREATE TRIGGER trg_after_update_dia_cobro AFTER UPDATE OF dia_cobro ON public.polizas FOR EACH ROW WHEN ((old.dia_cobro IS DISTINCT FROM new.dia_cobro)) EXECUTE FUNCTION fn_trigger_after_update_dia_cobro();
CREATE TRIGGER trg_after_update_forma_pago AFTER UPDATE OF forma_pago ON public.polizas FOR EACH ROW WHEN (((old.forma_pago)::text IS DISTINCT FROM (new.forma_pago)::text)) EXECUTE FUNCTION fn_trigger_after_update_forma_pago();
