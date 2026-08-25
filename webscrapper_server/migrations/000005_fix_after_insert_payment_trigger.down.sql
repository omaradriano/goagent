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
