package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/repository"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

// Historial de sincronizaciones (migracion 19). La extension abre un
// sync_run al iniciar cada sync, manda su sync_id en los PUT/POST de polizas
// y lo cierra al terminar; los handlers de polizas registran como
// sync_eventos lo que cambio (pago detectado, estatus, alta). El registro de
// eventos nunca hace fallar la sincronizacion: un error solo se loguea.

var validSyncTipos = map[string]bool{
	models.SyncTipoParcial: true, models.SyncTipoCompleta: true, models.SyncTipoIndividual: true,
}

var validSyncEstadosFin = map[string]bool{
	models.SyncEstadoCompletada: true, models.SyncEstadoInterrumpida: true, models.SyncEstadoDetenida: true,
}

func agenteIDFromRequest(w http.ResponseWriter, r *http.Request) (int, bool) {
	uuid, _ := r.Context().Value(middlewares.UserIDKey).(string)
	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), uuid)
	if err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error obteniendo información del agente", w)
		return 0, false
	}
	return agenteID, true
}

// ApiPostSyncRun abre un sync_run: POST /v1/scrapping/sync-runs {tipo}.
func ApiPostSyncRun(w http.ResponseWriter, r *http.Request) {
	agenteID, ok := agenteIDFromRequest(w, r)
	if !ok {
		return
	}

	var body struct {
		Tipo string `json:"tipo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !validSyncTipos[body.Tipo] {
		services.HandleResponseError(http.StatusBadRequest, "Tipo de sincronización inválido", w)
		return
	}

	run, err := deps.SyncRepo.StartRun(r.Context(), agenteID, body.Tipo)
	if err != nil {
		services.Log.ErrorMessage("Error abriendo sync_run: " + err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error registrando la sincronización", w)
		return
	}
	services.HandleResponseSuccessWithData(map[string]int{"sync_id": run.SyncID}, w)
}

// ApiPatchSyncRun cierra un sync_run: PATCH /v1/scrapping/sync-runs/{id}
// {estado}.
func ApiPatchSyncRun(w http.ResponseWriter, r *http.Request) {
	agenteID, ok := agenteIDFromRequest(w, r)
	if !ok {
		return
	}

	syncID, err := strconv.Atoi(chi.URLParam(r, "syncID"))
	if err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Sincronización inválida", w)
		return
	}

	var body struct {
		Estado string `json:"estado"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !validSyncEstadosFin[body.Estado] {
		services.HandleResponseError(http.StatusBadRequest, "Estado de sincronización inválido", w)
		return
	}

	found, err := deps.SyncRepo.FinishRun(r.Context(), syncID, agenteID, body.Estado)
	if err != nil {
		services.Log.ErrorMessage("Error cerrando sync_run: " + err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error registrando la sincronización", w)
		return
	}
	if !found {
		services.HandleResponseError(http.StatusNotFound, "La sincronización no existe", w)
		return
	}
	services.HandleResponseSuccess(w)
}

// ApiGetSyncRuns lista las ultimas sincronizaciones con el conteo de cambios:
// GET /v1/sync-runs?limit=10.
func ApiGetSyncRuns(w http.ResponseWriter, r *http.Request) {
	agenteID, ok := agenteIDFromRequest(w, r)
	if !ok {
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	runs, err := deps.SyncRepo.ListRuns(r.Context(), agenteID, limit)
	if err != nil {
		services.Log.ErrorMessage("Error listando sync_runs: " + err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando sincronizaciones", w)
		return
	}
	if runs == nil {
		runs = []repository.SyncRunSummary{}
	}
	services.HandleResponseSuccessWithData(runs, w)
}

// ApiGetSyncRunEventos devuelve los cambios de una sincronizacion:
// GET /v1/sync-runs/{syncID}/eventos.
func ApiGetSyncRunEventos(w http.ResponseWriter, r *http.Request) {
	agenteID, ok := agenteIDFromRequest(w, r)
	if !ok {
		return
	}

	syncID, err := strconv.Atoi(chi.URLParam(r, "syncID"))
	if err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Sincronización inválida", w)
		return
	}

	eventos, err := deps.SyncRepo.GetRunEventos(r.Context(), syncID, agenteID)
	if err != nil {
		services.Log.ErrorMessage("Error consultando sync_eventos: " + err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando los cambios", w)
		return
	}
	if eventos == nil {
		eventos = []repository.SyncEventoDetalle{}
	}
	services.HandleResponseSuccessWithData(eventos, w)
}

// recordResyncEventos registra lo que cambio en el resync de una poliza ya
// existente: pago detectado (next_payment avanzo) y cambio de estatus.
func recordResyncEventos(ctx context.Context, agenteID int, syncID *int, polizaID int64,
	oldEstatus, newEstatus string, oldNext, newNext *time.Time) {
	var eventos []models.SyncEvento
	if oldNext != nil && newNext != nil && newNext.After(*oldNext) {
		eventos = append(eventos, newSyncEvento(agenteID, syncID, polizaID, models.SyncEventoPago,
			oldNext.UTC().Format("2006-01-02"), newNext.UTC().Format("2006-01-02")))
	}
	if oldEstatus != "" && newEstatus != "" && oldEstatus != newEstatus {
		eventos = append(eventos, newSyncEvento(agenteID, syncID, polizaID, models.SyncEventoEstatus,
			oldEstatus, newEstatus))
	}
	logSyncEventos(ctx, eventos)
}

// recordAltaEventos registra un evento "alta" por cada poliza insertada.
func recordAltaEventos(ctx context.Context, agenteID int, syncID *int, polizaIDs []int64) {
	eventos := make([]models.SyncEvento, 0, len(polizaIDs))
	for _, id := range polizaIDs {
		eventos = append(eventos, newSyncEvento(agenteID, syncID, id, models.SyncEventoAlta, "", ""))
	}
	logSyncEventos(ctx, eventos)
}

func newSyncEvento(agenteID int, syncID *int, polizaID int64, tipo, anterior, nuevo string) models.SyncEvento {
	ev := models.SyncEvento{AgenteID: agenteID, SyncID: syncID, PolizaID: polizaID, Tipo: tipo}
	if anterior != "" {
		ev.ValorAnterior = &anterior
	}
	if nuevo != "" {
		ev.ValorNuevo = &nuevo
	}
	return ev
}

func logSyncEventos(ctx context.Context, eventos []models.SyncEvento) {
	if err := deps.SyncRepo.LogEventos(ctx, eventos); err != nil {
		services.Log.ErrorMessage("Error registrando sync_eventos: " + err.Error())
	}
}
