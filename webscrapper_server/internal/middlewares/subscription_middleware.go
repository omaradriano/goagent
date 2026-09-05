package middlewares

import (
	"encoding/json"
	"net/http"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/dto"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

var SubscriptionDB *gorm.DB

func SubscriptionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uuid, _ := r.Context().Value(UserIDKey).(string)
		if uuid == "" {
			writeSubscriptionError(w, http.StatusUnauthorized, "Usuario no autenticado")
			return
		}

		var agente models.Agente
		err := SubscriptionDB.WithContext(r.Context()).
			Select("is_subscribed").
			Where("agente_uuid = ?", uuid).
			First(&agente).Error

		if err != nil {
			writeSubscriptionError(w, http.StatusInternalServerError, "Error verificando suscripción")
			return
		}

		if !agente.IsSubscribed {
			writeSubscriptionError(w, http.StatusForbidden, "Se requiere una suscripción activa para esta acción")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// writeSubscriptionError responde en JSON (dto.HttpError), consistente con
// services.HandleResponseError - no se puede importar el paquete services
// aca directamente porque services ya importa middlewares (ciclo), pero dto
// es un paquete hoja sin dependencias, asi que se marshalea a mano.
func writeSubscriptionError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(dto.HttpError{
		Success: false,
		Code:    code,
		Message: message,
	})
}
