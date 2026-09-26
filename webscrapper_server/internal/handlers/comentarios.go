package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

const maxComentarioLen = 2000

// polizaDelAgente resuelve la poliza {polizaUUID} de la URL solo si pertenece
// al agente de la sesion. Escribe la respuesta de error y devuelve ok=false
// si no.
func polizaDelAgente(w http.ResponseWriter, r *http.Request) (polizaID int64, agenteID int, ok bool) {
	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	polizaUUID := chi.URLParam(r, "polizaUUID")
	if polizaUUID == "" {
		services.HandleResponseError(http.StatusBadRequest, "UUID de póliza requerido", w)
		return 0, 0, false
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.HandleResponseError(http.StatusUnauthorized, "Agente no encontrado", w)
		return 0, 0, false
	}

	err = deps.DB.WithContext(r.Context()).
		Raw("SELECT poliza_id FROM polizas WHERE poliza_uuid = ? AND agente_id = ?", polizaUUID, agenteID).
		Scan(&polizaID).Error
	if err != nil || polizaID == 0 {
		services.HandleResponseError(http.StatusNotFound, "Póliza no encontrada", w)
		return 0, 0, false
	}
	return polizaID, agenteID, true
}

// ApiGetPolizaComentarios lista la bitacora de comentarios de una poliza, del
// mas reciente al mas antiguo.
func ApiGetPolizaComentarios(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	polizaID, _, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	comentarios, err := deps.ComentarioRepo.ListByPoliza(r.Context(), polizaID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando comentarios", w)
		return
	}
	services.HandleResponseSuccessWithData(comentarios, w)
}

// ApiPostPolizaComentario agrega un comentario a la bitacora de la poliza.
func ApiPostPolizaComentario(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "POST")

	var body struct {
		Contenido string `json:"contenido"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error decodificando JSON", w)
		return
	}
	contenido := strings.TrimSpace(body.Contenido)
	if contenido == "" {
		services.HandleResponseError(http.StatusBadRequest, "El comentario no puede estar vacío", w)
		return
	}
	if utf8.RuneCountInString(contenido) > maxComentarioLen {
		services.HandleResponseError(http.StatusBadRequest, "El comentario no puede exceder 2000 caracteres", w)
		return
	}

	polizaID, agenteID, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	comentario, err := deps.ComentarioRepo.Create(r.Context(), polizaID, agenteID, contenido)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error guardando el comentario", w)
		return
	}
	services.HandleResponseSuccessWithData(comentario, w)
}

// ApiDeletePolizaComentario hace borrado logico de un comentario de la
// poliza.
func ApiDeletePolizaComentario(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "DELETE")

	comentarioID, err := strconv.Atoi(chi.URLParam(r, "comentarioID"))
	if err != nil || comentarioID <= 0 {
		services.HandleResponseError(http.StatusBadRequest, "ID de comentario inválido", w)
		return
	}

	polizaID, _, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	deleted, err := deps.ComentarioRepo.SoftDelete(r.Context(), polizaID, comentarioID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error eliminando el comentario", w)
		return
	}
	if !deleted {
		services.HandleResponseError(http.StatusNotFound, "Comentario no encontrado", w)
		return
	}
	services.HandleResponseSuccess(w)
}
