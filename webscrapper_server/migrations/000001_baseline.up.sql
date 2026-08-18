-- Baseline: schema completo al estado post-Flyway (mayo 2026)
-- Este archivo NO se ejecuta en DBs existentes — se marca como aplicado con `migrate force 1`

CREATE TABLE IF NOT EXISTS public.aseguradoras_conf (
    aseguradora_id serial PRIMARY KEY,
    nombre character varying(200) NOT NULL,
    clave character varying(5) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.agentes (
    agente_id serial PRIMARY KEY,
    agente_uuid uuid DEFAULT gen_random_uuid() UNIQUE,
    email character varying(100) NOT NULL UNIQUE,
    password_hash character varying(100),
    api_key character varying(100),
    daysuntiladvice smallint DEFAULT 5 NOT NULL,
    google_id character varying(255) UNIQUE,
    is_verified boolean DEFAULT false,
    verification_token text,
    verification_expires timestamp with time zone,
    reset_token text,
    reset_expires timestamp with time zone,
    no_agente character varying(6) NOT NULL UNIQUE,
    aseguradora_id bigint REFERENCES public.aseguradoras_conf(aseguradora_id),
    role character varying(10) DEFAULT 'user',
    is_subscribed boolean DEFAULT false NOT NULL,
    stripe_subscription_id text,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    current_period_end bigint DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.polizas (
    poliza_id serial PRIMARY KEY,
    poliza_uuid uuid DEFAULT gen_random_uuid() UNIQUE,
    dia_cobro smallint NOT NULL,
    estatus character varying(50) NOT NULL,
    fecha_emision timestamp with time zone NOT NULL,
    forma_pago character varying(50) NOT NULL,
    medio_cobro character varying(50) NOT NULL,
    numpoliza character varying(50) NOT NULL UNIQUE,
    plan character varying(100) NOT NULL,
    tipo_seguro character varying(50) NOT NULL,
    addr_calle character varying(200) DEFAULT 'No definido',
    addr_codigopostal character varying(10) DEFAULT '00000',
    addr_ciudad character varying(100) DEFAULT 'No definido',
    addr_colonia character varying(100) DEFAULT 'No definido',
    addr_estado character varying(100) DEFAULT 'No definido',
    last_modified timestamp with time zone DEFAULT now(),
    moneda character varying(50),
    telefono character varying(15),
    suma_asegurada character varying(50),
    email character varying(50),
    pais character varying(50),
    agente_id bigint REFERENCES public.agentes(agente_id)
);

CREATE TABLE IF NOT EXISTS public.asegurados (
    asegurado_id serial PRIMARY KEY,
    asegurado_uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    birthday timestamp with time zone,
    nombre_completo character varying(200) NOT NULL,
    is_principal boolean,
    poliza_id bigint REFERENCES public.polizas(poliza_id)
);

CREATE TABLE IF NOT EXISTS public.polizas_payments_conf (
    payment_conf_id serial PRIMARY KEY,
    next_payment timestamp with time zone,
    allownotifications boolean DEFAULT false,
    poliza_id bigint REFERENCES public.polizas(poliza_id)
);

CREATE TABLE IF NOT EXISTS public.polizas_payments_log (
    payment_log_id serial PRIMARY KEY,
    last_updated timestamp with time zone DEFAULT now(),
    paid_period timestamp with time zone NOT NULL,
    poliza_id bigint REFERENCES public.polizas(poliza_id),
    agente_id bigint REFERENCES public.agentes(agente_id)
);

-- Procedures and functions

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

CREATE OR REPLACE FUNCTION public.fn___before_insert_poliza_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    vMinAllowed DATE;
    vMaxAllowed DATE;
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
    vMaxAllowed := (vProximoVencimiento + INTERVAL '1 month')::DATE;

    IF CURRENT_DATE >= vMinAllowed AND CURRENT_DATE <= vMaxAllowed THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'PAGO BLOQUEADO: Estas fuera de la ventana de cobro (Inicia cobro: %, Vence: %)', vMinAllowed, vMaxAllowed;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn__after_insert_poliza_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    vNextPayment TIMESTAMPTZ;
    vPolizaUUID UUID;
BEGIN
    SELECT p.poliza_uuid, c.next_payment
    INTO vPolizaUUID, vNextPayment
    FROM polizas p
    LEFT JOIN polizas_payments_conf c ON c.poliza_id = p.poliza_id
    WHERE p.poliza_id = NEW.poliza_id;

    IF vPolizaUUID IS NULL THEN
        RAISE EXCEPTION 'ERROR en fn__after_insert_poliza_payment: No se encontro el UUID para la poliza ID %', NEW.poliza_id;
    END IF;

    CALL fn__set_next_payment(vPolizaUUID, vNextPayment);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn__after_update_client()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.last_modified := NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE PROCEDURE public.fn__set_next_payment(IN ppoliza_id uuid, IN pfecha_emision timestamp with time zone)
LANGUAGE plpgsql AS $$
DECLARE
    vClaveAseguradora aseguradoras_conf.clave%TYPE;
    vDiasEnMes        INT;
    vDiaCobro         INT;
    vFechaCobro       TIMESTAMPTZ;
    vDiaEmision       INT;
    vDiaEmisionBase   INT;
    vDiaSemana        INT;
    vNextPaymentDate  TIMESTAMPTZ;
    vPlazoPago        polizas.forma_pago%TYPE;
    vInterval         INTERVAL;
    vExistePolizaConf polizas_payments_conf.poliza_id%TYPE;
    vPolizaID         polizas.poliza_id%TYPE;
BEGIN
    BEGIN
        SELECT ac.clave, p.forma_pago, p.poliza_id, p.dia_cobro
        INTO STRICT vClaveAseguradora, vPlazoPago, vPolizaID, vDiaEmisionBase
        FROM polizas p
        JOIN agentes a ON a.agente_id = p.agente_id
        JOIN aseguradoras_conf ac ON ac.aseguradora_id = a.aseguradora_id
        WHERE p.poliza_uuid = ppoliza_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE EXCEPTION 'No se encontro la poliza o configuracion para el UUID: %', ppoliza_id;
    END;

    IF vDiaEmisionBase = 0 THEN
        vDiaEmision := EXTRACT(DAY FROM (pfecha_emision AT TIME ZONE 'America/Mexico_City'))::int;
    ELSE
        vDiaEmision := vDiaEmisionBase;
    END IF;

    SELECT ppc.poliza_id INTO vExistePolizaConf
    FROM polizas_payments_conf ppc WHERE ppc.poliza_id = vPolizaID;

    IF vClaveAseguradora = 'SM' THEN
        vInterval := CASE
            WHEN vPlazoPago = 'MENSUAL'    THEN INTERVAL '1 month'
            WHEN vPlazoPago = 'TRIMESTRAL' THEN INTERVAL '3 months'
            WHEN vPlazoPago = 'SEMESTRAL'  THEN INTERVAL '6 months'
            WHEN vPlazoPago = 'ANUAL'      THEN INTERVAL '12 months'
            ELSE INTERVAL '1 month'
        END;

        vNextPaymentDate := pfecha_emision;
        IF vNextPaymentDate >= NOW() THEN
            vNextPaymentDate := vNextPaymentDate + vInterval;
        ELSE
            WHILE vNextPaymentDate <= NOW() LOOP
                vNextPaymentDate := vNextPaymentDate + vInterval;
            END LOOP;
        END IF;

        vDiasEnMes := EXTRACT(DAY FROM (DATE_TRUNC('month', vNextPaymentDate) + INTERVAL '1 month - 1 day'))::int;
        vDiaCobro := LEAST(vDiaEmision, vDiasEnMes);
        vFechaCobro := make_timestamptz(
            EXTRACT(YEAR FROM vNextPaymentDate)::int,
            EXTRACT(MONTH FROM vNextPaymentDate)::int,
            vDiaCobro, 0, 0, 0, 'America/Mexico_City'
        );

        vDiaSemana := EXTRACT(DOW FROM vFechaCobro)::int;
        IF vDiaSemana = 6 THEN
            vFechaCobro := vFechaCobro + INTERVAL '2 days';
        ELSIF vDiaSemana = 0 THEN
            vFechaCobro := vFechaCobro + INTERVAL '1 day';
        END IF;

        IF vExistePolizaConf IS NOT NULL THEN
            UPDATE polizas_payments_conf SET next_payment = vFechaCobro WHERE poliza_id = vPolizaID;
        ELSE
            INSERT INTO polizas_payments_conf (poliza_id, next_payment) VALUES (vPolizaID, vFechaCobro);
        END IF;
    ELSE
        RAISE NOTICE 'Aseguradora % usa calculo manual por ahora.', vClaveAseguradora;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERROR en fn__set_next_payment: % (Codigo: %)', SQLERRM, SQLSTATE;
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

CREATE OR REPLACE FUNCTION public.fn_trigger_set_next_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    vPolizaUUID polizas.poliza_uuid%TYPE;
BEGIN
    SELECT poliza_uuid FROM polizas INTO vPolizaUUID WHERE poliza_id = NEW.poliza_id;
    CALL fn__set_next_payment(vPolizaUUID, NEW.fecha_emision);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trigger_update_next_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    CALL fn__set_next_payment(OLD.poliza_uuid, NEW.next_payment);
    RETURN NEW;
END;
$$;

-- Triggers

CREATE TRIGGER trg_after_insert AFTER INSERT ON public.polizas
    FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_set_next_payment();

CREATE TRIGGER trg_after_insert_poliza_payment AFTER INSERT ON public.polizas_payments_log
    FOR EACH ROW EXECUTE FUNCTION public.fn__after_insert_poliza_payment();

CREATE TRIGGER trg_after_update_dia_cobro AFTER UPDATE OF dia_cobro ON public.polizas
    FOR EACH ROW WHEN (old.dia_cobro IS DISTINCT FROM new.dia_cobro)
    EXECUTE FUNCTION public.fn_trigger_after_update_dia_cobro();

CREATE TRIGGER trg_after_update_forma_pago AFTER UPDATE OF forma_pago ON public.polizas
    FOR EACH ROW WHEN ((old.forma_pago)::text IS DISTINCT FROM (new.forma_pago)::text)
    EXECUTE FUNCTION public.fn_trigger_after_update_forma_pago();

CREATE TRIGGER trg_before_insert_poliza_payment BEFORE INSERT ON public.polizas_payments_log
    FOR EACH ROW EXECUTE FUNCTION public.fn___before_insert_poliza_payment();

CREATE TRIGGER trg_clients_last_modified BEFORE UPDATE ON public.polizas
    FOR EACH ROW EXECUTE FUNCTION public.fn__after_update_client();
