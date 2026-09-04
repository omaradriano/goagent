package handlers

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/dto"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
)

// syncFlexiblePoliza persiste anualidad+pagos de una poliza flexible y
// recalcula/guarda next_payment. Compartido por ApiPostPoliza (alta) y
// ApiPutPoliza (resync) - la logica es identica salvo que en el resync el
// polizaID ya existia de antes.
//
// Si flexible es nil o sus fechas son invalidas, cae al estimado de
// PrimerPagoEstimado (misma logica que antes vivia duplicada 2 veces en
// ApiPostPoliza) para que la poliza no desaparezca de los listados que
// hacen JOIN contra polizas_payments_conf - el siguiente sync exitoso la
// corrige con datos reales.
func syncFlexiblePoliza(ctx context.Context, polizaID int64, formaPago string, diaCobro int16, fechaEmision time.Time, flexible *dto.PostItem_PolizaFlexible) error {
	if flexible == nil {
		nextPayment := services.PrimerPagoEstimado(fechaEmision, formaPago, diaCobro)
		return deps.PolizaRepo.UpsertNextPayment(ctx, polizaID, nextPayment)
	}

	desde, errDesde := time.Parse("2006-01-02", flexible.AnualidadDesde)
	hasta, errHasta := time.Parse("2006-01-02", flexible.AnualidadHasta)
	if errDesde != nil || errHasta != nil {
		nextPayment := services.PrimerPagoEstimado(fechaEmision, formaPago, diaCobro)
		return deps.PolizaRepo.UpsertNextPayment(ctx, polizaID, nextPayment)
	}

	pid := polizaID
	now := time.Now()
	anualidad := &models.PolizaFlexibleAnualidad{
		PolizaID:        &pid,
		PrimaBasicaUdis: flexible.PrimaBasicaUdis,
		AnualidadDesde:  desde,
		AnualidadHasta:  hasta,
		LastSynced:      &now,
	}
	if err := deps.PolizaFlexibleRepo.UpsertAnualidad(ctx, anualidad); err != nil {
		return err
	}

	var pagos []models.PolizaFlexiblePago
	var pagosUdis []float64
	for _, p := range flexible.Pagos {
		fecha, err := time.Parse("2006-01-02", p.Fecha)
		if err != nil {
			continue
		}
		pagos = append(pagos, models.PolizaFlexiblePago{
			PolizaID:   &pid,
			FechaPago:  fecha,
			ImporteUdi: p.ImporteUdi,
		})
		pagosUdis = append(pagosUdis, p.ImporteUdi)
	}
	if err := deps.PolizaFlexibleRepo.ReplacePagos(ctx, pid, pagos); err != nil {
		return err
	}

	cobertura := services.CalcularSiguientePago(flexible.PrimaBasicaUdis, desde, hasta, formaPago, pagosUdis, diaCobro)
	return deps.PolizaRepo.UpsertNextPayment(ctx, pid, cobertura.NextPayment)
}

// syncTradicionalUltimoPago actualiza (o crea, via UpsertNextPayment)
// polizas_payments_conf.next_payment a partir del ultimo_pago scrapeado de
// una poliza tradicional individual - version de un solo item de la logica
// que ya existe inline en la query UNNEST de ApiPostPolizas para el batch
// completo. No-op si ultimoPago viene vacio/"null"/no parseable, igual que
// el comportamiento actual del bulk (esas polizas simplemente no entran al
// UNNEST).
func syncTradicionalUltimoPago(ctx context.Context, polizaID int64, ultimoPago string) error {
	if ultimoPago == "" || ultimoPago == "null" {
		return nil
	}
	parts := strings.Split(ultimoPago, "-")
	if len(parts) != 3 {
		return nil
	}
	year, errY := strconv.Atoi(parts[0])
	month, errM := strconv.Atoi(parts[1])
	day, errD := strconv.Atoi(parts[2])
	if errY != nil || errM != nil || errD != nil {
		return nil
	}
	fecha := time.Date(year, time.Month(month), day, 12, 0, 0, 0, time.UTC)
	return deps.PolizaRepo.UpsertNextPayment(ctx, polizaID, fecha)
}
