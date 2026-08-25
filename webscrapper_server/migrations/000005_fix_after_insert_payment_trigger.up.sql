CREATE OR REPLACE FUNCTION public.fn__after_insert_poliza_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    vFormaPago       polizas.forma_pago%TYPE;
    vFechaEmision    polizas.fecha_emision%TYPE;
    vDiaCobroPoliza  polizas.dia_cobro%TYPE;
    vDiaEmision      INT;
    vInterval        INTERVAL;
    vNextPaymentDate TIMESTAMPTZ;
    vFloorDate_mx    DATE;
    vDiasEnMes       INT;
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

    -- Avanza exactamente un periodo a partir del periodo pagado, sin adelantarse hasta la fecha actual
    vNextPaymentDate := NEW.paid_period + vInterval;

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
