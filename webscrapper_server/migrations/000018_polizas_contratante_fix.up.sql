-- El detalle de poliza del portal muestra el numero de poliza en el campo
-- "Contratante"; la extension lo guardaba asi. Se limpian esos valores (el
-- nombre real se llena desde la grilla de la cartera en la siguiente
-- sincronizacion).
UPDATE public.polizas SET contratante = NULL WHERE contratante = numpoliza;
