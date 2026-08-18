-- Revertir baseline: elimina todo el schema
DROP TRIGGER IF EXISTS trg_clients_last_modified ON public.polizas;
DROP TRIGGER IF EXISTS trg_before_insert_poliza_payment ON public.polizas_payments_log;
DROP TRIGGER IF EXISTS trg_after_update_forma_pago ON public.polizas;
DROP TRIGGER IF EXISTS trg_after_update_dia_cobro ON public.polizas;
DROP TRIGGER IF EXISTS trg_after_insert_poliza_payment ON public.polizas_payments_log;
DROP TRIGGER IF EXISTS trg_after_insert ON public.polizas;

DROP FUNCTION IF EXISTS public.fn_trigger_update_next_payment();
DROP FUNCTION IF EXISTS public.fn_trigger_set_next_payment();
DROP FUNCTION IF EXISTS public.fn_trigger_after_update_forma_pago();
DROP FUNCTION IF EXISTS public.fn_trigger_after_update_dia_cobro();
DROP FUNCTION IF EXISTS public.fn__after_update_client();
DROP FUNCTION IF EXISTS public.fn__after_insert_poliza_payment();
DROP FUNCTION IF EXISTS public.fn___before_insert_poliza_payment();
DROP PROCEDURE IF EXISTS public.fn__set_next_payment(uuid, timestamptz);
DROP PROCEDURE IF EXISTS public.cleanuser(character varying);

DROP TABLE IF EXISTS public.polizas_payments_log;
DROP TABLE IF EXISTS public.polizas_payments_conf;
DROP TABLE IF EXISTS public.asegurados;
DROP TABLE IF EXISTS public.polizas;
DROP TABLE IF EXISTS public.agentes;
DROP TABLE IF EXISTS public.aseguradoras_conf;
