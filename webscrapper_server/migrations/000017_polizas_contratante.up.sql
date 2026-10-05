-- Contratante de la poliza (puede ser distinto del asegurado principal). La
-- extension ya lo extraia del detalle pero el backend lo descartaba; se llena
-- al crear o resincronizar cada poliza. NULL = aun no resincronizada.
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS contratante varchar(150);
