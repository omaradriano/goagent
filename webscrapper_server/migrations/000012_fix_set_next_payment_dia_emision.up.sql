-- fecha_emision se guarda como medianoche UTC (Go: time.Parse("2006-01-02")).
-- Extraer el dia en America/Mexico_City lo recorria al dia anterior (18:00 del
-- dia previo), asi que polizas con dia_cobro = 0 quedaban cobrando un dia antes
-- (ej. emision 28/08 -> next_payment 27/08). El dia se toma ahora en UTC; para
-- las fechas base que vienen de next_payment (medianoche MX = 06:00 UTC) el dia
-- calendario es el mismo, asi que el recalculo tras registrar un pago no cambia.

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
        vDiaEmision := EXTRACT(DAY FROM (pfecha_emision AT TIME ZONE 'UTC'))::int;
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
