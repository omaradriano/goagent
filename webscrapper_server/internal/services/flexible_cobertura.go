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

// toleranciaUdis perdona hasta esta cantidad de UDIS de deficit al evaluar
// si un periodo esta cubierto - pequenas diferencias de redondeo del tipo de
// cambio UDIS/MXN entre pagos (ej. 234.90 vs 234.94 UDIS en depositos que
// deberian ser identicos) no deben dejar un periodo marcado como incompleto.
// Un sobrepago ya avanza el periodo correctamente sin necesitar este ajuste.
const toleranciaUdis = 5.0

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

// aplicarDiaCobro fuerza el dia del mes de "t" a diaCobro (acotado a los
// dias que tenga ese mes), igual que ya hace fn__set_next_payment/
// fn_trigger_after_* para polizas tradicionales: dia_cobro, cuando esta
// definido (>0), tiene prioridad sobre el dia natural de la fecha calculada.
// Si diaCobro es 0 (no definido), "t" se deja sin modificar.
func aplicarDiaCobro(t time.Time, diaCobro int16) time.Time {
	if diaCobro <= 0 {
		return t
	}
	primerDiaMes := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	diasEnMes := primerDiaMes.AddDate(0, 1, -1).Day()
	dia := int(diaCobro)
	if dia > diasEnMes {
		dia = diasEnMes
	}
	return time.Date(t.Year(), t.Month(), dia, 0, 0, 0, 0, t.Location())
}

// CalcularSiguientePago determina hasta que periodo de la anualidad quedan
// cubiertos los depositos UDIS. Un periodo solo cuenta como cubierto cuando
// esta 100% pagado (sin importar cuantos depositos parciales lo componen), por
// lo que el resultado no avanza al siguiente periodo hasta completarlo.
func CalcularSiguientePago(primaBasica float64, desde, hasta time.Time, formaPago string, pagos []float64, diaCobro int16) CoberturaResult {
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
		periodosCompletos = int(math.Floor((totalPagado + toleranciaUdis) / pagoEsperado))
	}
	if periodosCompletos > n {
		periodosCompletos = n
	}
	if periodosCompletos < 0 {
		periodosCompletos = 0
	}

	// Los periodos se cuentan en meses de calendario anclados al dia de
	// "desde", no como fracciones proporcionales de la duracion total de la
	// anualidad - de lo contrario se acumula un corrimiento de varios dias
	// respecto a la fecha real que usa el asegurador. Si la poliza tiene un
	// dia_cobro definido, ese dia tiene prioridad sobre el dia natural de
	// "desde" (mismo criterio que las polizas tradicionales).
	nextPayment := ajustarFinDeSemana(
		aplicarDiaCobro(desde.AddDate(0, meses*periodosCompletos, 0), diaCobro),
	)

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
// disponible, hasta que un sync posterior traiga los datos reales. dia_cobro,
// cuando esta definido, tiene prioridad sobre el dia de fecha_emision.
func PrimerPagoEstimado(fechaEmision time.Time, formaPago string, diaCobro int16) time.Time {
	meses, ok := mesesPorFormaPago[formaPago]
	if !ok {
		meses = 1
	}
	return ajustarFinDeSemana(aplicarDiaCobro(fechaEmision.AddDate(0, meses, 0), diaCobro))
}
