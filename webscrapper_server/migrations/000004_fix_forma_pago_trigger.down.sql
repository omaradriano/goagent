CREATE OR REPLACE FUNCTION public.fn_trigger_after_update_forma_pago()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;
