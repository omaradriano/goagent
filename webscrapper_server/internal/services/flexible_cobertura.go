package services

import (
	"math"
	"time"
)

// CoberturaResult es el resultado de evaluar los depositos UDIS de una poliza
// flexible contra su prima basica, escalonado por periodo completo.
type CoberturaResult struct {
	NextPayment     time.Time
	TotalPagadoUdis float64
	UdisFaltantes   float64
}

var pagosPorAnioFormaPago = map[string]int{
	"MENSUAL":    12,
	"TRIMESTRAL": 4,
	"SEMESTRAL":  2,
	"ANUAL":      1,
}

// ajustarFinDeSemana traslada una fecha que cae en fin de semana al
// siguiente dia habil, igual que fn__set_next_payment/fn_trigger_after_*
// hacen para las polizas tradicionales: sabado se recorre 2 dias (a lunes),
// domingo se recorre 1 dia (a lunes).
func ajustarFinDeSemana(t time.Time) time.Time {
	switch t.Weekday() {
	case time.Saturday:
		return t.AddDate(0, 0, 2)
	case time.Sunday:
		return t.AddDate(0, 0, 1)
	default:
		return t
	}
}

// CalcularSiguientePago determina hasta que periodo de la anualidad quedan
// cubiertos los depositos UDIS. Un periodo solo cuenta como cubierto cuando
// esta 100% pagado (sin importar cuantos depositos parciales lo componen), por
// lo que el resultado no avanza al siguiente periodo hasta completarlo.
func CalcularSiguientePago(primaBasica float64, desde, hasta time.Time, formaPago string, pagos []float64) CoberturaResult {
	n, ok := pagosPorAnioFormaPago[formaPago]
	if !ok || n <= 0 {
		n = 12
	}
	meses, ok := mesesPorFormaPago[formaPago]
	if !ok || meses <= 0 {
		meses = 1
	}

	pagoEsperado := primaBasica / float64(n)

	var totalPagado float64
	for _, p := range pagos {
		totalPagado += p
	}

	periodosCompletos := 0
	if pagoEsperado > 0 {
		periodosCompletos = int(math.Floor(totalPagado / pagoEsperado))
	}
	if periodosCompletos > n {
		periodosCompletos = n
	}
	if periodosCompletos < 0 {
		periodosCompletos = 0
	}

	// Los periodos se cuentan en meses de calendario anclados al dia de
	// "desde" (igual que dia_cobro para tradicionales), no como fracciones
	// proporcionales de la duracion total de la anualidad - de lo contrario
	// se acumula un corrimiento de varios dias respecto a la fecha real que
	// usa el asegurador.
	nextPayment := ajustarFinDeSemana(desde.AddDate(0, meses*periodosCompletos, 0))

	acumuladoPeriodoActual := totalPagado - float64(periodosCompletos)*pagoEsperado
	udisFaltantes := pagoEsperado - acumuladoPeriodoActual
	if udisFaltantes < 0 {
		udisFaltantes = 0
	}

	return CoberturaResult{
		NextPayment:     nextPayment,
		TotalPagadoUdis: totalPagado,
		UdisFaltantes:   udisFaltantes,
	}
}

var mesesPorFormaPago = map[string]int{
	"MENSUAL":    1,
	"TRIMESTRAL": 3,
	"SEMESTRAL":  6,
	"ANUAL":      12,
}

// PrimerPagoEstimado calcula la fecha estimada del primer pago para una
// poliza flexible recien emitida de la que todavia no se pudo capturar la
// tabla de anualidades/aportaciones (ej. el asegurador aun no la provisiona).
// Se usa fecha_emision + un periodo segun forma_pago como mejor estimado
// disponible, hasta que un sync posterior traiga los datos reales.
func PrimerPagoEstimado(fechaEmision time.Time, formaPago string) time.Time {
	meses, ok := mesesPorFormaPago[formaPago]
	if !ok {
		meses = 1
	}
	return ajustarFinDeSemana(fechaEmision.AddDate(0, meses, 0))
}
