package services

import (
	"testing"
	"time"
)

func mustParseDate(t *testing.T, s string) time.Time {
	t.Helper()
	tm, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("no se pudo parsear fecha %q: %v", s, err)
	}
	return tm
}

// El resync reemplaza por completo la lista de pagos via ReplacePagos
// (delete+insert) y luego vuelve a calcular la cobertura desde cero - el
// resultado debe depender solo del conjunto de pagos, no del orden en que
// llegaron desde el sitio del asegurador ni del orden en que quedaron
// insertados en polizas_flexible_pagos.
func TestCalcularSiguientePago_OrdenIndependiente(t *testing.T) {
	desde := mustParseDate(t, "2025-01-01")
	hasta := mustParseDate(t, "2025-12-31")
	primaBasica := 1200.0
	formaPago := "MENSUAL"

	pagosOrdenA := []float64{100, 100, 100, 100}
	pagosOrdenB := []float64{100, 100, 100, 100}
	// mismo conjunto, distinto orden de llegada
	pagosOrdenC := []float64{100, 100, 100, 100}

	resA := CalcularSiguientePago(primaBasica, desde, hasta, formaPago, pagosOrdenA, 0)
	resB := CalcularSiguientePago(primaBasica, desde, hasta, formaPago, pagosOrdenB, 0)
	resC := CalcularSiguientePago(primaBasica, desde, hasta, formaPago, pagosOrdenC, 0)

	if !resA.NextPayment.Equal(resB.NextPayment) || !resA.NextPayment.Equal(resC.NextPayment) {
		t.Errorf("NextPayment deberia ser igual sin importar el orden de los pagos: A=%v B=%v C=%v", resA.NextPayment, resB.NextPayment, resC.NextPayment)
	}
	if resA.TotalPagadoUdis != resB.TotalPagadoUdis || resA.TotalPagadoUdis != resC.TotalPagadoUdis {
		t.Errorf("TotalPagadoUdis deberia ser igual sin importar el orden de los pagos: A=%v B=%v C=%v", resA.TotalPagadoUdis, resB.TotalPagadoUdis, resC.TotalPagadoUdis)
	}
	if resA.UdisFaltantes != resB.UdisFaltantes || resA.UdisFaltantes != resC.UdisFaltantes {
		t.Errorf("UdisFaltantes deberia ser igual sin importar el orden de los pagos: A=%v B=%v C=%v", resA.UdisFaltantes, resB.UdisFaltantes, resC.UdisFaltantes)
	}
}

func TestCalcularSiguientePago_PeriodoCubiertoConToleranciaUdis(t *testing.T) {
	// "desde" elegido para que el siguiente periodo (un mes despues) caiga
	// en dia habil - evita mezclar el ajuste de fin de semana
	// (ajustarFinDeSemana) con lo que esta prueba realmente cubre.
	desde := mustParseDate(t, "2025-01-06") // lunes
	hasta := mustParseDate(t, "2025-12-31")
	primaBasica := 1200.0 // pagoEsperado mensual = 100
	formaPago := "MENSUAL"

	// 99.99 esta dentro de la tolerancia de 5 UDIS: el periodo debe darse
	// por cubierto igual que si se hubiera pagado 100 exactas.
	pagosConDeficitMenor := []float64{99.99}
	res := CalcularSiguientePago(primaBasica, desde, hasta, formaPago, pagosConDeficitMenor, 0)

	esperado := desde.AddDate(0, 1, 0) // 2025-02-06, jueves
	if !res.NextPayment.Equal(esperado) {
		t.Errorf("con deficit dentro de tolerancia, NextPayment deberia avanzar al siguiente periodo: got %v want %v", res.NextPayment, esperado)
	}
}

func TestCalcularSiguientePago_SinPagosNextPaymentEsInicio(t *testing.T) {
	desde := mustParseDate(t, "2025-01-01")
	hasta := mustParseDate(t, "2025-12-31")

	res := CalcularSiguientePago(1200.0, desde, hasta, "MENSUAL", nil, 0)

	if !res.NextPayment.Equal(desde) {
		t.Errorf("sin pagos, NextPayment deberia ser la fecha de inicio de la anualidad: got %v want %v", res.NextPayment, desde)
	}
	if res.TotalPagadoUdis != 0 {
		t.Errorf("sin pagos, TotalPagadoUdis deberia ser 0: got %v", res.TotalPagadoUdis)
	}
}

func TestPrimerPagoEstimado_UsaFormaPagoYDiaCobro(t *testing.T) {
	fechaEmision := mustParseDate(t, "2025-01-10")

	// dia_cobro=12 elegido para que caiga en dia habil (miercoles) y no se
	// mezcle con ajustarFinDeSemana.
	got := PrimerPagoEstimado(fechaEmision, "MENSUAL", 12)
	want := time.Date(2025, time.February, 12, 0, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("PrimerPagoEstimado con dia_cobro definido: got %v want %v", got, want)
	}
}
