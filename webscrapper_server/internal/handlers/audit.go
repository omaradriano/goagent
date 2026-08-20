package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

func ApiGetPolizaAudit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	polizaUUID := chi.URLParam(r, "polizaUUID")
	if polizaUUID == "" {
		services.HandleResponseError(http.StatusBadRequest, "UUID de póliza requerido", w)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.HandleResponseError(http.StatusUnauthorized, "Agente no encontrado", w)
		return
	}

	var polizaID int
	err = deps.DB.Raw("SELECT poliza_id FROM polizas WHERE poliza_uuid = ? AND agente_id = ?", polizaUUID, agenteID).Scan(&polizaID).Error
	if err != nil || polizaID == 0 {
		services.HandleResponseError(http.StatusNotFound, "Póliza no encontrada", w)
		return
	}

	logs, err := deps.AuditRepo.GetPolizaAudit(r.Context(), polizaID, limit, offset)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando historial", w)
		return
	}

	services.HandleResponseSuccessWithData(logs, w)
}

func ApiGetAgenteAudit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.HandleResponseError(http.StatusUnauthorized, "Agente no encontrado", w)
		return
	}

	logs, err := deps.AuditRepo.GetAgenteAudit(r.Context(), agenteID, limit, offset)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando historial", w)
		return
	}

	services.HandleResponseSuccessWithData(logs, w)
}

func ApiGetAllPolizaAudit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	role, _ := r.Context().Value(middlewares.UserRole).(string)
	if role != "admin" {
		services.HandleResponseError(http.StatusForbidden, "Acceso denegado", w)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	entries, err := deps.AuditRepo.GetAllPolizaAudit(r.Context(), limit, offset)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando historial", w)
		return
	}

	services.HandleResponseSuccessWithData(entries, w)
}

func ApiRevertPolizaAudit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "POST")

	role, _ := r.Context().Value(middlewares.UserRole).(string)
	if role != "admin" {
		services.HandleResponseError(http.StatusForbidden, "Acceso denegado", w)
		return
	}

	auditIDStr := chi.URLParam(r, "auditID")
	auditID, err := strconv.Atoi(auditIDStr)
	if err != nil || auditID <= 0 {
		services.HandleResponseError(http.StatusBadRequest, "ID de auditoría inválido", w)
		return
	}

	auditEntry, err := deps.AuditRepo.GetPolizaAuditByID(r.Context(), auditID)
	if err != nil {
		services.HandleResponseError(http.StatusNotFound, "Entrada de auditoría no encontrada", w)
		return
	}

	if auditEntry.OldValue == nil {
		services.HandleResponseError(http.StatusBadRequest, "No hay valor anterior para revertir", w)
		return
	}

	fields := make(map[string]interface{})
	oldValue := *auditEntry.OldValue

	switch auditEntry.FieldName {
	case "dia_cobro":
		v, err := strconv.Atoi(oldValue)
		if err != nil {
			services.HandleResponseError(http.StatusBadRequest, "Valor anterior de dia_cobro inválido", w)
			return
		}
		fields[auditEntry.FieldName] = v
	case "forma_pago", "estatus", "telefono":
		fields[auditEntry.FieldName] = oldValue
	default:
		services.HandleResponseError(http.StatusBadRequest, "Campo no soportado para revertir: "+auditEntry.FieldName, w)
		return
	}

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)
	adminID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.HandleResponseError(http.StatusUnauthorized, "Agente admin no encontrado", w)
		return
	}

	if err := deps.PolizaRepo.UpdatePolizaFieldsByID(r.Context(), auditEntry.PolizaID, fields, adminID, deps.AuditRepo); err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error revirtiendo cambio", w)
		return
	}

	services.HandleResponseSuccess(w)
}

func ApiGetAllAgenteAudit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	role, _ := r.Context().Value(middlewares.UserRole).(string)
	if role != "admin" {
		services.HandleResponseError(http.StatusForbidden, "Acceso denegado", w)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	entries, err := deps.AuditRepo.GetAllAgenteAudit(r.Context(), limit, offset)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando historial", w)
		return
	}

	services.HandleResponseSuccessWithData(entries, w)
}
