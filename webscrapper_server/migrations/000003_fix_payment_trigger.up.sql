CREATE OR REPLACE FUNCTION public.fn___before_insert_poliza_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;
