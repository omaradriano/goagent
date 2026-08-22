package configs

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/handlers"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

func NewRouter() http.Handler {
	r := chi.NewRouter()

	r.Use(middlewares.RateLimitMiddleware)
	r.Use(services.CORSMiddleware)

	r.Route("/v1", func(r chi.Router) {
		// Auth routes (no JWT required)
		r.Post("/auth/authenticate/google", handlers.ApiAuthenticateUserByGoogle)
		r.Post("/auth/authenticate/manual", handlers.ApiAuthenticateUserByCredentials)
		r.Post("/auth/register", handlers.ApiRegisterUser)
		r.Post("/auth/resetpasswordmail", handlers.ApiResetPasswordMail)
		r.Get("/auth/verifyaccount", handlers.ApiVerifyAccount)
		r.Post("/auth/setpassword", handlers.ApiSetCredentials)
		r.Get("/auth/verifyPasswordExist/{email}", handlers.ApiCheckPasswordExist)

		// Stripe webhook (no JWT, uses Stripe signature verification)
		r.Post("/api/stripe_webhook_handler", handlers.StripeWebhookHandler)

		// JWT-protected routes (lectura - no requieren suscripción)
		r.Group(func(r chi.Router) {
			r.Use(middlewares.JWTMiddleware)

			r.Get("/auth/checkSession", handlers.ApiCheckSession)

			// Lectura de polizas
			r.Get("/scrapping/details", handlers.ApiGetDetails)
			r.Get("/scrapping/polizas", handlers.ApiGetPolizas)
			r.Get("/scrapping/polizas_ids", handlers.ApiGetPolizasIds)
			r.Get("/scrapping/poliza/{polizaNum}", handlers.ApiGetPoliza)

			// Audit (lectura)
			r.Get("/audit/poliza/{polizaUUID}", handlers.ApiGetPolizaAudit)
			r.Get("/audit/agente", handlers.ApiGetAgenteAudit)

			// Admin audit (lectura, role check inside handler)
			r.Get("/audit/all/polizas", handlers.ApiGetAllPolizaAudit)
			r.Get("/audit/all/agentes", handlers.ApiGetAllAgenteAudit)

			// Stripe subscriptions (consulta y gestión)
			r.Post("/api/create_suscription_payment", handlers.CreateStripeCheckoutSession)
			r.Get("/api/subscription_status", handlers.ApiGetSubscriptionStatus)
			r.Post("/api/cancel_subscription", handlers.ApiCancelSubscription)
		})

		// JWT + suscripción requerida (escritura)
		r.Group(func(r chi.Router) {
			r.Use(middlewares.JWTMiddleware)
			r.Use(middlewares.SubscriptionMiddleware)

			// Captura / scrapping de polizas
			r.Post("/scrapping/poliza", handlers.ApiPostPoliza)
			r.Post("/scrapping/polizas", handlers.ApiPostPolizas)

			// Modificación de polizas
			r.Patch("/scrapping/poliza", handlers.ApiPatchPoliza)

			// Calendario de cumpleaños
			r.Get("/polizas/birthdates", handlers.ApiGetBirthdates)

			// Pagos
			r.Patch("/payments/poliza", handlers.ApiSetPayment)

			// Revertir auditoría
			r.Post("/audit/revert/poliza/{auditID}", handlers.ApiRevertPolizaAudit)
		})
	})

	return r
}
