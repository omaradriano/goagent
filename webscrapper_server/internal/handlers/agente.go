package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/dto"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

func ApiGetAgenteProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	agente, err := deps.AgenteRepo.FindByUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error obteniendo información del agente", w)
		return
	}

	services.HandleResponseSuccessWithData(map[string]any{
		"daysuntiladvice": agente.DaysUntilAdvice,
	}, w)
}

func ApiPatchAgenteProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "PATCH")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	var item dto.PatchItem_Agente
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error decodificando JSON", w)
		return
	}

	fields := make(map[string]any)

	if item.DaysUntilAdvice != nil {
		if *item.DaysUntilAdvice < 1 || *item.DaysUntilAdvice > 8 {
			services.HandleResponseError(http.StatusBadRequest, "daysuntiladvice inválido (debe ser entre 1 y 8)", w)
			return
		}
		fields["daysuntiladvice"] = *item.DaysUntilAdvice
	}

	if len(fields) == 0 {
		services.HandleResponseError(http.StatusBadRequest, "No se proporcionaron campos para actualizar", w)
		return
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error obteniendo información del agente", w)
		return
	}

	if err := deps.AgenteRepo.UpdateProfileFields(r.Context(), agenteID, fields); err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error actualizando perfil", w)
		return
	}

	services.HandleResponseSuccess(w)
}
