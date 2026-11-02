# Fase 1 — Desacoplar BD y server de Seguros Monterrey

Objetivo: que una póliza de cualquier aseguradora se guarde, calcule su próximo
pago y aparezca en el dashboard. **Para SM nada debe cambiar** (salvo el conteo
de activas, ver "Cambios visibles"). Sin cambios en la extensión.

Fuera de alcance (fases siguientes): endpoint de ingesta genérico, conectores
de la extensión, UI para elegir varias aseguradoras, `detalles` JSONB de autos.

## Hallazgos que cambian el diseño original

1. **El estatus de SM ya no es solo "En Vigor"/"Anulada".** En staging hay
   `En Vigor` (377), `Anulada` (282), `En Vigor sin Pago de Primas` (6),
   `Vigor Prorrogado` (5) y `EN VIGOR` (1). Hoy el dashboard cuenta "activas"
   con `estatus = 'En Vigor'`, así que esas 12 salen como inactivas aunque no
   están anuladas (por vencer sí las incluye, porque usa `!= 'Anulada'`).
2. **La extensión compara el estatus crudo del portal contra el de la BD**
   (`/scrapping/resync/estatus`) para decidir qué resincronizar. Si
   normalizamos `polizas.estatus`, cada sync detectaría "cambios" en toda la
   cartera. Por eso `estatus` se queda con el texto original y se agrega una
   columna canónica aparte (en vez de `estatus_origen` como propuse antes).

## Migración `000020_multi_aseguradora`

Todo en una transacción. Las aseguradoras se buscan por `clave`, nunca por id fijo.

### 1. `polizas.aseguradora_id`
```sql
ALTER TABLE polizas ADD COLUMN aseguradora_id integer REFERENCES aseguradoras_conf(aseguradora_id);
UPDATE polizas p SET aseguradora_id = a.aseguradora_id FROM agentes a WHERE a.agente_id = p.agente_id;
ALTER TABLE polizas ALTER COLUMN aseguradora_id SET NOT NULL;
```
Verificado en staging: 671 pólizas, 0 sin agente, los 5 agentes con aseguradora.

### 2. Número de póliza único por aseguradora
```sql
DROP INDEX clients_unique_numpoliza;  -- (numpoliza) global
CREATE UNIQUE INDEX polizas_aseguradora_numpoliza ON polizas (aseguradora_id, numpoliza);
```

### 3. Estatus canónico
```sql
ALTER TABLE polizas ADD COLUMN vigente boolean;
UPDATE polizas SET vigente = (estatus <> 'Anulada');
ALTER TABLE polizas ALTER COLUMN vigente SET NOT NULL;
```
Un booleano basta para cobranza: lo único que importa es si se cobra o no.
Lo calcula el server al guardar (ver "Server" punto 2); el texto original
sigue en `estatus` para mostrarlo y para la comparación de la extensión.

### 4. Agente con varias aseguradoras
```sql
CREATE TABLE agente_aseguradoras (
  agente_id      integer NOT NULL REFERENCES agentes(agente_id) ON DELETE CASCADE,
  aseguradora_id integer NOT NULL REFERENCES aseguradoras_conf(aseguradora_id),
  clave_agente   varchar(20) NOT NULL,
  PRIMARY KEY (agente_id, aseguradora_id),
  UNIQUE (aseguradora_id, clave_agente)
);
INSERT INTO agente_aseguradoras SELECT agente_id, aseguradora_id, no_agente FROM agentes WHERE aseguradora_id IS NOT NULL;
```
`agentes.no_agente` y `agentes.aseguradora_id` **se quedan** en esta fase: la
extensión y el registro los usan. Se retiran cuando exista la UI multi-aseguradora.
Hay que revisar `cleanuser` (migraciones 7, 9 y 10) para que también borre aquí
(el `ON DELETE CASCADE` lo cubre si borra el agente).

### 5. Cobranza para cualquier aseguradora
`fn__set_next_payment`: quitar el `IF vClaveAseguradora = 'SM'` (la regla de
emisión + periodicidad es genérica) y leer la aseguradora de
`polizas.aseguradora_id` en vez de pasar por `agentes`. Una `forma_pago` fuera de
MENSUAL/TRIMESTRAL/SEMESTRAL/ANUAL hoy cae en "mensual" en silencio; se cambia a
`RAISE EXCEPTION` para que un conector mal mapeado falle en la ingesta y no
genere fechas de cobro falsas.

### Down
Revierte en orden inverso: restaura el procedimiento de la migración 12, borra
`agente_aseguradoras`, `vigente`, el índice compuesto (re-crea el global) y
`aseguradora_id`.

## Server

1. **`LEFT JOIN polizas_payments_conf`** en las 5 consultas:
   `handlers/scrapping.go:561, 622, 773`, `repository/poliza_repository.go:310`,
   `repository/sync_repository.go:23`. Con el procedimiento corregido toda
   póliza tendrá fila, pero el LEFT JOIN evita que una falla futura la oculte.
2. **Estatus canónico en Go**: `vigente := item.Estatus != "Anulada"` en los
   inserts/updates de pólizas (`ApiPostPolizas`, `ApiPostPoliza`, `ApiPutPoliza`,
   `ApiPatchPoliza`). Función por aseguradora (`esVigente(clave, estatus)`) con
   test; en esta fase solo existe la regla de SM.
3. **Consultas que usan estatus** pasan a `vigente`:
   - `scrapping.go:556-557` activas/inactivas → `vigente` / `NOT vigente`
   - `poliza_repository.go:312, 421` y `sync_repository.go:17` → `p.vigente`
   - filtro del dashboard (`scrapping.go:743`, `show_anuladas`) → `vigente`
   - `scrapping.go:1175` (no recalcular Anuladas) → `!vigente`
   - `scrapping.go:492` (PATCH de estatus manual) se queda validando los dos
     textos de SM, y además actualiza `vigente`.
4. **`aseguradora_id` al insertar**: las rutas actuales solo las usa la
   extensión de SM, así que el server toma la aseguradora del agente
   (`agentes.aseguradora_id`). En la Fase 2 la manda el conector.
5. **Login con Google** (`auth.go:114`): el `aseguradoraID := int64(1)` fijo se
   cambia por búsqueda de la clave `SM` (mismo comportamiento, sin id mágico) y
   se inserta también en `agente_aseguradoras`. Igual en registro y set-password.
6. **JWT**: se agrega `aseguradoras: [{id, clave, nombre, clave_agente}]`. Se
   conservan `no_agente`, `insurance_name` e `insurance_id` porque la extensión
   actual los usa (valida que el agente del portal sea el de la sesión).
7. **Respuestas de pólizas**: agregan `vigente` y `aseguradora` (clave y nombre).
8. **Búsquedas por número**: siguen filtrando por agente. Mientras solo exista
   SM no hay ambigüedad; `FindPolizaIDByNumPoliza` (sin agente) se revisa y se
   acota por agente. El filtro por aseguradora llega con la Fase 2.

## Front (mínimo)
- Color de la píldora y filtros por `vigente` en vez de `=== "En Vigor"`
  (`spanCard.tsx`, `CssComponents.ts`, `modal.tsx:246`, `dashboard.tsx`).
  El texto mostrado sigue siendo el estatus original.
- Mostrar la aseguradora en el detalle de póliza (dato ya disponible).

## Cambios visibles para el usuario
- Las pólizas `Vigor Prorrogado`, `En Vigor sin Pago de Primas` y `EN VIGOR`
  pasan a contar como **activas** y se pintan en verde. Hoy cuentan como
  inactivas por comparar el texto exacto. Es una corrección, pero cambia los
  números del dashboard.

## Pruebas
1. Corregir `DB_URL` de DEV en `webscrapper_server/.env` (la contraseña de Neon
   cambió y hoy no conecta).
2. `migrate up` → `down` → `up` en DEV; comparar conteos antes/después:
   pólizas, pólizas con `next_payment`, por vencer, activas/anuladas.
3. Tests de Go: `esVigente`, y un test del procedimiento con una póliza de
   aseguradora ficticia que debe recibir `next_payment`.
4. Push a `dev` → CI aplica la migración en staging → sync completa con la
   extensión `build:staging` → mismos números que antes (salvo las 12 de arriba).
5. PR a `main` + aprobación de `prod`.

## Estimado
3–4 días: migración y down (1), server + tests (1.5), front (0.5), pruebas en
DEV/staging (1).

## Desviaciones durante la implementación
- **`LEFT JOIN` solo en 3 de las 5 consultas** (total del dashboard, detalle y
  listado). Por vencer y candidatas a resync filtran por `next_payment`: ahí el
  `JOIN` es correcto.
- **`agente_aseguradoras` se mantiene con un trigger** sobre `agentes`
  (`trg_sync_agente_aseguradora`) en lugar de tocar registro, alta por Google y
  set-password por separado.
- **El JWT no cambia todavía.** Nadie consume la lista de aseguradoras; se
  agrega con la UI multi-aseguradora.
- **`esVigente` es una sola regla** (todo lo que no es "Anulada"). Se vuelve
  por aseguradora con el primer conector que use otros textos.
- **Los rellenos apagan `trg_clients_last_modified`**: sin eso la migración
  ponía `last_modified = NOW()` en toda la cartera y rompía "Recientes".
- **`FindPolizaIDByNumPoliza` se eliminó**: no tenía llamadas y era ambigua con
  varias aseguradoras.

