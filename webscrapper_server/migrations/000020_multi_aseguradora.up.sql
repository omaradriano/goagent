-- Fase 1 multi-aseguradora: la poliza guarda su aseguradora, el numero de
-- poliza es unico por aseguradora, "vigente" es el estatus canonico (estatus
-- conserva el texto del portal, que la extension compara en el resync), un
-- agente puede tener clave en varias aseguradoras y el calculo de next_payment
-- deja de ser exclusivo de Seguros Monterrey.

-- Los rellenos no son ediciones de la poliza: sin esto, trg_clients_last_modified
-- pondria last_modified = NOW() en toda la cartera y romperia el orden "Recientes".
ALTER TABLE polizas DISABLE TRIGGER trg_clients_last_modified;

-- 1. Aseguradora de cada poliza (hoy, la del agente).
ALTER TABLE polizas ADD COLUMN aseguradora_id integer REFERENCES aseguradoras_conf(aseguradora_id);
UPDATE polizas p SET aseguradora_id = a.aseguradora_id FROM agentes a WHERE a.agente_id = p.agente_id;
ALTER TABLE polizas ALTER COLUMN aseguradora_id SET NOT NULL;

-- 2. Numero de poliza unico por aseguradora (antes, global).
ALTER TABLE polizas DROP CONSTRAINT clients_unique_numpoliza;
ALTER TABLE polizas ADD CONSTRAINT polizas_aseguradora_numpoliza UNIQUE (aseguradora_id, numpoliza);

-- 3. Estatus canonico para cobranza.
ALTER TABLE polizas ADD COLUMN vigente boolean;
UPDATE polizas SET vigente = (estatus <> 'Anulada');
ALTER TABLE polizas ALTER COLUMN vigente SET NOT NULL;

ALTER TABLE polizas ENABLE TRIGGER trg_clients_last_modified;

-- 4. Claves de agente por aseguradora. agentes.no_agente/aseguradora_id se
-- conservan mientras la extension y el registro los usen.
CREATE TABLE agente_aseguradoras (
    agente_id      integer     NOT NULL REFERENCES agentes(agente_id) ON DELETE CASCADE,
    aseguradora_id integer     NOT NULL REFERENCES aseguradoras_conf(aseguradora_id),
    clave_agente   varchar(20) NOT NULL,
    PRIMARY KEY (agente_id, aseguradora_id),
    UNIQUE (aseguradora_id, clave_agente)
);
INSERT INTO agente_aseguradoras (agente_id, aseguradora_id, clave_agente)
SELECT agente_id, aseguradora_id, no_agente FROM agentes WHERE aseguradora_id IS NOT NULL;

-- Mientras el registro y la extension sigan usando agentes.no_agente /
-- agentes.aseguradora_id, este trigger refleja esos dos campos aqui
-- (registro, alta por Google y set-password pasan por el).
CREATE FUNCTION fn_sync_agente_aseguradora() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.aseguradora_id IS DISTINCT FROM NEW.aseguradora_id THEN
        DELETE FROM agente_aseguradoras WHERE agente_id = OLD.agente_id AND aseguradora_id = OLD.aseguradora_id;
    END IF;
    IF NEW.aseguradora_id IS NOT NULL THEN
        INSERT INTO agente_aseguradoras (agente_id, aseguradora_id, clave_agente)
        VALUES (NEW.agente_id, NEW.aseguradora_id, NEW.no_agente)
        ON CONFLICT (agente_id, aseguradora_id) DO UPDATE SET clave_agente = EXCLUDED.clave_agente;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_agente_aseguradora
AFTER INSERT OR UPDATE OF no_agente, aseguradora_id ON agentes
FOR EACH ROW EXECUTE FUNCTION fn_sync_agente_aseguradora();

-- 5. next_payment para cualquier aseguradora. Misma regla que la migracion 12,
-- sin el IF de 'SM'. Una forma_pago desconocida ya no cae en "mensual" en
-- silencio: falla, para que un conector mal mapeado no genere cobros falsos.
CREATE OR REPLACE PROCEDURE public.fn__set_next_payment(IN ppoliza_id uuid, IN pfecha_emision timestamp with time zone)
LANGUAGE plpgsql AS $$
DECLARE
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
        SELECT p.forma_pago, p.poliza_id, p.dia_cobro
        INTO STRICT vPlazoPago, vPolizaID, vDiaEmisionBase
        FROM polizas p
        WHERE p.poliza_uuid = ppoliza_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE EXCEPTION 'No se encontro la poliza para el UUID: %', ppoliza_id;
    END;

    IF vDiaEmisionBase = 0 THEN
        vDiaEmision := EXTRACT(DAY FROM (pfecha_emision AT TIME ZONE 'UTC'))::int;
    ELSE
        vDiaEmision := vDiaEmisionBase;
    END IF;

    SELECT ppc.poliza_id INTO vExistePolizaConf
    FROM polizas_payments_conf ppc WHERE ppc.poliza_id = vPolizaID;

    vInterval := CASE vPlazoPago
        WHEN 'MENSUAL'    THEN INTERVAL '1 month'
        WHEN 'TRIMESTRAL' THEN INTERVAL '3 months'
        WHEN 'SEMESTRAL'  THEN INTERVAL '6 months'
        WHEN 'ANUAL'      THEN INTERVAL '12 months'
    END;
    IF vInterval IS NULL THEN
        RAISE EXCEPTION 'forma_pago desconocida: % (poliza %)', vPlazoPago, ppoliza_id;
    END IF;

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
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERROR en fn__set_next_payment: % (Codigo: %)', SQLERRM, SQLSTATE;
END;
$$;
