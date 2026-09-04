package dto

type HttpError struct {
	Success bool   `json:"success"`
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type HttpSuccess struct {
	Success bool   `json:"success"`
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Payload any    `json:"payload,omitempty"`
}

type GetItem_Poliza struct {
	DiaCobro           int16       `json:"diaCobro"`
	Estatus            string      `json:"estatus"`
	FechaEmision       string      `json:"fecha_emision"`
	FormaPago          string      `json:"forma_pago"`
	MedioCobro         string      `json:"medio_cobro"`
	NumPoliza          string      `json:"num_poliza"`
	Plan               string      `json:"plan"`
	TipoSeguro         string      `json:"tipo_seguro"`
	Moneda             string      `json:"moneda"`
	Pais               string      `json:"pais"`
	Asegurados         []Asegurado `json:"asegurados"`
	Email              string      `json:"email"`
	Telefono           string      `json:"telefono"`
	SumaAsegurada      string      `json:"suma_asegurada"`
	UltimaModificacion string      `json:"last_modified"`
	PaymentExist       string      `json:"payment_exist"`

	Direccion Address `json:"direccion"`

	SiguientePago string `json:"next_payment"`
	PolizaUUID    string `json:"poliza_uuid"`
	TipoPoliza    string `json:"tipo_poliza"`

	Flexible *GetItem_PolizaFlexible `json:"flexible,omitempty"`
}

type GetItem_PolizaFlexiblePago struct {
	Fecha      string  `json:"fecha"`
	ImporteUdi float64 `json:"importe_udi"`
}

type GetItem_PolizaFlexible struct {
	PrimaBasicaUdis float64                      `json:"prima_basica_udis"`
	AnualidadDesde  string                       `json:"anualidad_desde"`
	AnualidadHasta  string                       `json:"anualidad_hasta"`
	TotalPagadoUdis float64                      `json:"total_pagado_udis"`
	UdisFaltantes   float64                      `json:"udis_faltantes"`
	EsperadoHoyUdis float64                      `json:"esperado_hoy_udis"`
	Pagos           []GetItem_PolizaFlexiblePago `json:"pagos,omitempty"`
}

type Asegurado struct {
	Nombre      string `json:"nombre"`
	IsPrincipal bool   `json:"is_principal"`
	Cumpleanos  string `json:"birthday"`
}

type Address struct {
	Calle        string `json:"calle"`
	CodigoPostal string `json:"codigo_postal"`
	Ciudad       string `json:"ciudad"`
	Estado       string `json:"estado"`
	Colonia      string `json:"colonia"`
}

type AseguradoBirthdate struct {
	NombreCompleto string `json:"nombrecompleto"`
	Birthdate      string `json:"birthdate"`
	Numpoliza      string `json:"numpoliza"`
}

type JWTClaims struct {
	Email         string `json:"email"`
	AgenteUUID    string `json:"agente_uuid"`
	NoAgente      string `json:"no_agente"`
	Role          string `json:"agente_role"`
	InsuranceName string `json:"insurance_name"`
	InsuranceID   string `json:"insurance_id"`
}

type Google_User_Response struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Google_ID string `json:"sub"`
}

type Server_Response_With_Token struct {
	JWT_Token string `json:"jwt_token"`
	Email     string `json:"email,omitempty"`
}

type Verify_Password_Response struct {
	HasPassword   bool   `json:"haspassword"`
	PasswordToken string `json:"passtoken,omitempty"`
}

type SubscriptionStatusPayload struct {
	IsSubscribed      bool  `json:"is_subscribed"`
	CancelAtPeriodEnd bool  `json:"cancel_at_period_end"`
	CurrentPeriodEnd  int64 `json:"current_period_end"`
}

type PolizasUserDetails struct {
	Total             int `json:"total"`
	Activas           int `json:"activas"`
	Inactivas         int `json:"inactivas"`
	PorVencer         int `json:"por_vencer"`
	CoberturaActiva   int `json:"cobertura_activa"`
	SinPagoRegistrado int `json:"sin_pago_registrado"`
	Recientes         int `json:"recientes"`
}
