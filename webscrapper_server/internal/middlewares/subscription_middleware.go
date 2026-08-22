package middlewares

import (
	"net/http"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

var SubscriptionDB *gorm.DB

func SubscriptionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uuid, _ := r.Context().Value(UserIDKey).(string)
		if uuid == "" {
			http.Error(w, "Usuario no autenticado", http.StatusUnauthorized)
			return
		}

		var agente models.Agente
		err := SubscriptionDB.WithContext(r.Context()).
			Select("is_subscribed").
			Where("agente_uuid = ?", uuid).
			First(&agente).Error

		if err != nil {
			http.Error(w, "Error verificando suscripción", http.StatusInternalServerError)
			return
		}

		if !agente.IsSubscribed {
			http.Error(w, "Se requiere una suscripción activa para esta acción", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
