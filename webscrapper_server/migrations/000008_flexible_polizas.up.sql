-- Soporte para polizas flexibles (Historico de Aportaciones / UDIS)

ALTER TABLE public.polizas
    ADD COLUMN tipo_poliza character varying(20) NOT NULL DEFAULT 'TRADICIONAL';

CREATE TABLE IF NOT EXISTS public.polizas_flexible_anualidad (
    anualidad_id serial PRIMARY KEY,
    poliza_id bigint NOT NULL UNIQUE REFERENCES public.polizas(poliza_id),
    prima_basica_udis numeric(14,4) NOT NULL,
    anualidad_desde timestamp with time zone NOT NULL,
    anualidad_hasta timestamp with time zone NOT NULL,
    last_synced timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.polizas_flexible_pagos (
    pago_id serial PRIMARY KEY,
    poliza_id bigint NOT NULL REFERENCES public.polizas(poliza_id),
    fecha_pago timestamp with time zone NOT NULL,
    importe_udi numeric(14,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flexible_pagos_poliza ON public.polizas_flexible_pagos(poliza_id);

-- Las polizas FLEXIBLE calculan y escriben next_payment desde Go (ver ApiPostPoliza/ApiPostPolizas),
-- en base a la cobertura de aportaciones UDIS, no con la logica de recibos tradicional.
-- Estos triggers se saltan por completo para ese tipo de poliza.

CREATE OR REPLACE FUNCTION public.fn_trigger_set_next_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    vPolizaUUID polizas.poliza_uuid%TYPE;
BEGIN
    IF NEW.tipo_poliza = 'FLEXIBLE' THEN
        RETURN NEW;
    END IF;

    SELECT poliza_uuid FROM polizas INTO vPolizaUUID WHERE poliza_id = NEW.poliza_id;
    CALL fn__set_next_payment(vPolizaUUID, NEW.fecha_emision);
    RETURN NEW;
END;
$$;

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
$$;

CREATE OR REPLACE FUNCTION public.fn_trigger_after_update_dia_cobro()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;
