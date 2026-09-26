package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/repository"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

const maxNombrePersonaLen = 150

// Valores validos de parentesco (mismo CHECK que la tabla).
var parentescosValidos = map[string]bool{
	"conyuge":     true,
	"hijo":        true,
	"padre_madre": true,
	"otro":        true,
}

// parsePersonaAdicional lee y valida el body de alta/edicion. Escribe la
// respuesta de error y devuelve ok=false si no es valido.
func parsePersonaAdicional(w http.ResponseWriter, r *http.Request) (in repository.PersonaAdicionalInput, ok bool) {
	var body struct {
		NombreCompleto string `json:"nombre_completo"`
		Dia            int    `json:"dia"`
		Mes            int    `json:"mes"`
		Parentesco     string `json:"parentesco"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error decodificando JSON", w)
		return in, false
	}

	nombre := strings.Join(strings.Fields(body.NombreCompleto), " ")
	if nombre == "" {
		services.HandleResponseError(http.StatusBadRequest, "El nombre no puede estar vacío", w)
		return in, false
	}
	if utf8.RuneCountInString(nombre) > maxNombrePersonaLen {
		services.HandleResponseError(http.StatusBadRequest, "El nombre no puede exceder 150 caracteres", w)
		return in, false
	}
	if !parentescosValidos[body.Parentesco] {
		services.HandleResponseError(http.StatusBadRequest, "Parentesco inválido", w)
		return in, false
	}
	// El dia se valida contra el ano fijo (bisiesto): 29 de febrero es valido,
	// 31 de abril no (time.Date lo normalizaria al 1 de mayo).
	if body.Mes < 1 || body.Mes > 12 || body.Dia < 1 ||
		time.Date(repository.PersonaAdicionalAno, time.Month(body.Mes), body.Dia, 0, 0, 0, 0, time.UTC).Day() != body.Dia {
		services.HandleResponseError(http.StatusBadRequest, "Fecha de cumpleaños inválida", w)
		return in, false
	}

	return repository.PersonaAdicionalInput{
		NombreCompleto: nombre,
		Dia:            body.Dia,
		Mes:            body.Mes,
		Parentesco:     body.Parentesco,
	}, true
}

func personaIDFromURL(w http.ResponseWriter, r *http.Request) (int, bool) {
	personaID, err := strconv.Atoi(chi.URLParam(r, "personaID"))
	if err != nil || personaID <= 0 {
		services.HandleResponseError(http.StatusBadRequest, "ID de persona inválido", w)
		return 0, false
	}
	return personaID, true
}

// ApiGetPolizaPersonasAdicionales lista las personas adicionales (no
// aseguradas) de una poliza.
func ApiGetPolizaPersonasAdicionales(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	polizaID, _, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	personas, err := deps.PersonaAdicionalRepo.ListByPoliza(r.Context(), polizaID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error consultando personas adicionales", w)
		return
	}
	services.HandleResponseSuccessWithData(personas, w)
}

// ApiPostPolizaPersonaAdicional agrega una persona adicional a la poliza.
func ApiPostPolizaPersonaAdicional(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "POST")

	in, ok := parsePersonaAdicional(w, r)
	if !ok {
		return
	}

	polizaID, agenteID, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	persona, err := deps.PersonaAdicionalRepo.Create(r.Context(), polizaID, agenteID, in)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error guardando la persona", w)
		return
	}
	services.HandleResponseSuccessWithData(persona, w)
}

// ApiPutPolizaPersonaAdicional edita una persona adicional de la poliza.
func ApiPutPolizaPersonaAdicional(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "PUT")

	personaID, ok := personaIDFromURL(w, r)
	if !ok {
		return
	}
	in, ok := parsePersonaAdicional(w, r)
	if !ok {
		return
	}

	polizaID, _, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	persona, err := deps.PersonaAdicionalRepo.Update(r.Context(), polizaID, personaID, in)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error guardando la persona", w)
		return
	}
	if persona == nil {
		services.HandleResponseError(http.StatusNotFound, "Persona no encontrada", w)
		return
	}
	services.HandleResponseSuccessWithData(persona, w)
}

// ApiDeletePolizaPersonaAdicional borra una persona adicional de la poliza.
func ApiDeletePolizaPersonaAdicional(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "DELETE")

	personaID, ok := personaIDFromURL(w, r)
	if !ok {
		return
	}

	polizaID, _, ok := polizaDelAgente(w, r)
	if !ok {
		return
	}

	deleted, err := deps.PersonaAdicionalRepo.Delete(r.Context(), polizaID, personaID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error eliminando la persona", w)
		return
	}
	if !deleted {
		services.HandleResponseError(http.StatusNotFound, "Persona no encontrada", w)
		return
	}
	services.HandleResponseSuccess(w)
}
