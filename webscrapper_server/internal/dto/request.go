package dto

type PostItem_Poliza struct {
	Asegurado     string                   `json:"asegurado"`
	Contratante   string                   `json:"contratante"`
	DiaCobro      int16                    `json:"dia_cobro"`
	Direccion     Address                  `json:"direccion"`
	Estatus       string                   `json:"estatus"`
	FechaEmision  string                   `json:"fecha_emision"`
	FormaPago     string                   `json:"forma_pago"`
	MedioCobro    string                   `json:"medio_cobro"`
	NumPoliza     string                   `json:"num_poliza"`
	Plan          string                   `json:"plan"`
	TipoSeguro    string                   `json:"tipo_seguro"`
	Asegurados    []Asegurado              `json:"asegurados"`
	Telefono      string                   `json:"telefono"`
	SumaAsegurada string                   `json:"suma_asegurada"`
	Pais          string                   `json:"pais"`
	Email         string                   `json:"email"`
	Moneda        string                   `json:"moneda"`
	UltimoPago    string                   `json:"ultimo_pago"`
	TipoPoliza    string                   `json:"tipo_poliza"`
	Flexible      *PostItem_PolizaFlexible `json:"flexible,omitempty"`
}

type PostItem_PolizaFlexiblePago struct {
	Fecha      string  `json:"fecha"`
	ImporteUdi float64 `json:"importe_udi"`
}

type PostItem_PolizaFlexible struct {
	PrimaBasicaUdis float64                       `json:"prima_basica_udis"`
	AnualidadDesde  string                        `json:"anualidad_desde"`
	AnualidadHasta  string                        `json:"anualidad_hasta"`
	Pagos           []PostItem_PolizaFlexiblePago `json:"pagos"`
}

type PostItems_Poliza struct {
	Payload []PostItem_Poliza `json:"payload"`
}

type PatchItem_Poliza struct {
	NumPoliza string  `json:"numpoliza"`
	DiaCobro  *int16  `json:"dia_cobro,omitempty"`
	Telefono  *string `json:"telefono,omitempty"`
	Email     *string `json:"email,omitempty"`
	FormaPago *string `json:"forma_pago,omitempty"`
	Estatus   *string `json:"estatus,omitempty"`
}

type GetItem_Poliza_Filters struct {
	Agente_id  int               `json:"agente_id,omitempty"`
	Filters    map[string]string `json:"filters"`
	PageSize   int               `json:"pageSize"`
	CurentPage int               `json:"currentPage"`
}

type Token struct {
	Token string `json:"token"`
}

type Google_Token struct {
	Payload Token
}

type SetPasswordCredentials struct {
	ResetToken   string `json:"resettoken"`
	Password     string `json:"password"`
	NumeroAsesor string `json:"no_asesor,omitempty"`
	Aseguradora  string `json:"insurance,omitempty"`
}

type UserAseguradorRegister struct {
	Email        string  `json:"email"`
	Password     string  `json:"password"`
	Insurance    *string `json:"insurance,omitempty"`
	NumeroAsesor string  `json:"no_asesor"`
}

type LoginUserCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ResetPasswordCredentials struct {
	Email string `json:"email"`
}
