package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/lib/pq"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/dto"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/middlewares"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"github.com/omaradriano/cobranzawebscrapper_server/internal/services"
	"gorm.io/gorm"
)

func ApiGetPolizasCountByUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID := r.URL.Query().Get("uuid")

	var count int64
	err := deps.DB.WithContext(r.Context()).
		Model(&models.Poliza{}).
		Joins("JOIN agentes a ON polizas.agente_id = a.agente_id").
		Where("a.agente_uuid = ?", userUUID).
		Count(&count).Error
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusBadRequest, err.Error(), w)
		return
	}

	services.HandleResponseSuccessWithData(count, w)
}

func ApiPostPolizas(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "POST")

	agenteUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), agenteUUID)
	if err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error obteniendo información del agente", w)
		return
	}

	var itemsReceived dto.PostItems_Poliza
	err = json.NewDecoder(r.Body).Decode(&itemsReceived)
	if err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error decoding JSON", w)
		return
	}

	if len(itemsReceived.Payload) == 0 {
		services.HandleResponseError(http.StatusBadRequest, "No se ha recibido información", w)
		return
	}

	existingNums, err := deps.PolizaRepo.GetNumPolizasByAgenteUUID(r.Context(), agenteUUID)
	if err != nil {
		services.HandleResponseError(http.StatusInternalServerError, "Ha ocurrido un error", w)
		return
	}

	existingSet := make(map[string]bool)
	for _, num := range existingNums {
		existingSet[strings.ToLower(strings.TrimSpace(num))] = true
	}

	var itemsToUpload []dto.PostItem_Poliza
	for _, item := range itemsReceived.Payload {
		item.NumPoliza = strings.TrimSpace(item.NumPoliza)
		if !existingSet[strings.ToLower(item.NumPoliza)] {
			itemsToUpload = append(itemsToUpload, item)
		}
	}

	if len(itemsToUpload) == 0 {
		services.HandleResponseError(http.StatusConflict, "Todos los registros ya se encuentran sincronizados", w)
		return
	}

	// Transaction using raw SQL for UNNEST-based bulk operations
	sqlDB, err := deps.DB.DB()
	if err != nil {
		services.HandleResponseError(http.StatusInternalServerError, "Error de conexión", w)
		return
	}

	tx, err := sqlDB.Begin()
	if err != nil {
		services.HandleResponseError(http.StatusInternalServerError, "Error al iniciar transacción", w)
		return
	}
	defer tx.Rollback()

	const colsPerItem = 20
	var placeholders []string
	var args []any

	for i, item := range itemsToUpload {
		base := i * colsPerItem
		phs := make([]string, colsPerItem)
		for j := 0; j < colsPerItem; j++ {
			phs[j] = fmt.Sprintf("$%d", base+j+1)
		}
		placeholders = append(placeholders, "("+strings.Join(phs, ", ")+")")

		tipoPoliza := item.TipoPoliza
		if tipoPoliza == "" {
			tipoPoliza = "TRADICIONAL"
		}

		args = append(args,
			item.DiaCobro, item.Estatus, item.FechaEmision, item.FormaPago, item.MedioCobro,
			item.NumPoliza, item.Plan, item.TipoSeguro, item.Direccion.Calle, item.Direccion.CodigoPostal,
			item.Direccion.Ciudad, item.Direccion.Colonia, item.Direccion.Estado, item.Moneda,
			item.Telefono, item.SumaAsegurada, item.Email, item.Pais, agenteID, tipoPoliza,
		)
	}

	queryStart := `INSERT INTO polizas (
		dia_cobro, estatus, fecha_emision, forma_pago, medio_cobro, numpoliza, plan,
		tipo_seguro, addr_calle, addr_codigopostal, addr_ciudad, addr_colonia,
		addr_estado, moneda, telefono, suma_asegurada, email, pais, agente_id, tipo_poliza
	) VALUES `
	finalQuery := queryStart + strings.Join(placeholders, ",") + " RETURNING poliza_id, numpoliza"

	polizasRows, err := tx.Query(finalQuery, args...)
	if err != nil {
		services.HandleResponseError(http.StatusConflict, "No se ha podido realizar la inserción de pólizas", w)
		return
	}

	polizasMap := make(map[string]int64)
	var totalInserted int64

	for polizasRows.Next() {
		var id int64
		var num string
		if err := polizasRows.Scan(&id, &num); err != nil {
			polizasRows.Close()
			services.HandleResponseError(http.StatusInternalServerError, "Error al procesar identificadores de pólizas", w)
			return
		}
		polizasMap[strings.ToLower(num)] = id
		totalInserted++
	}
	polizasRows.Close()

	var nombres []string
	var cumpleanos []string
	var principales []bool
	var polizaIDs []int64

	for _, item := range itemsToUpload {
		polizaID, exists := polizasMap[strings.ToLower(item.NumPoliza)]
		if !exists {
			continue
		}
		for _, aseg := range item.Asegurados {
			nombres = append(nombres, aseg.Nombre)
			cumpleanos = append(cumpleanos, aseg.Cumpleanos)
			principales = append(principales, aseg.IsPrincipal)
			polizaIDs = append(polizaIDs, polizaID)
		}
	}

	if len(nombres) > 0 {
		queryAsegurados := `
			INSERT INTO asegurados (nombre_completo, birthday, is_principal, poliza_id)
			SELECT temp.nombre, NULLIF(temp.cumple, '')::timestamptz, temp.principal, temp.pol_id
			FROM UNNEST($1::text[], $2::text[], $3::boolean[], $4::bigint[])
			AS temp(nombre, cumple, principal, pol_id);`

		_, err = tx.Exec(queryAsegurados,
			pq.Array(nombres), pq.Array(cumpleanos),
			pq.Array(principales), pq.Array(polizaIDs),
		)
		if err != nil {
			services.HandleResponseError(http.StatusConflict, "No se ha podido realizar la inserción de asegurados", w)
			return
		}
	}

	var flexPolizaIDs []int64
	var flexPrimaBasica []float64
	var flexDesde []time.Time
	var flexHasta []time.Time

	var pagoPolizaIDs []int64
	var pagoFechas []time.Time
	var pagoImportes []float64

	var nextPaymentIDs []int64
	var nextPaymentDates []time.Time

	for _, item := range itemsToUpload {
		if item.TipoPoliza != "FLEXIBLE" {
			continue
		}
		polizaID, exists := polizasMap[strings.ToLower(item.NumPoliza)]
		if !exists {
			continue
		}

		if item.Flexible == nil {
			// La extension no pudo capturar el detalle de aportaciones (ej.
			// poliza recien emitida, aun sin tabla de anualidades del lado
			// del asegurador). Se asegura igual una fila en
			// polizas_payments_conf, estimando el primer pago como
			// fecha_emision + un periodo, para que la poliza no desaparezca
			// de los listados - el siguiente sync exitoso la corrige con
			// datos reales.
			fechaEmision, errEmision := time.Parse("2006-01-02", item.FechaEmision)
			if errEmision != nil {
				fechaEmision = time.Now()
			}
			nextPaymentIDs = append(nextPaymentIDs, polizaID)
			nextPaymentDates = append(nextPaymentDates, services.PrimerPagoEstimado(fechaEmision, item.FormaPago))
			continue
		}

		desde, errDesde := time.Parse("2006-01-02", item.Flexible.AnualidadDesde)
		hasta, errHasta := time.Parse("2006-01-02", item.Flexible.AnualidadHasta)
		if errDesde != nil || errHasta != nil {
			fechaEmision, errEmision := time.Parse("2006-01-02", item.FechaEmision)
			if errEmision != nil {
				fechaEmision = time.Now()
			}
			nextPaymentIDs = append(nextPaymentIDs, polizaID)
			nextPaymentDates = append(nextPaymentDates, services.PrimerPagoEstimado(fechaEmision, item.FormaPago))
			continue
		}

		flexPolizaIDs = append(flexPolizaIDs, polizaID)
		flexPrimaBasica = append(flexPrimaBasica, item.Flexible.PrimaBasicaUdis)
		flexDesde = append(flexDesde, desde)
		flexHasta = append(flexHasta, hasta)

		var pagosUdis []float64
		for _, pago := range item.Flexible.Pagos {
			fechaPago, err := time.Parse("2006-01-02", pago.Fecha)
			if err != nil {
				continue
			}
			pagoPolizaIDs = append(pagoPolizaIDs, polizaID)
			pagoFechas = append(pagoFechas, fechaPago)
			pagoImportes = append(pagoImportes, pago.ImporteUdi)
			pagosUdis = append(pagosUdis, pago.ImporteUdi)
		}

		cobertura := services.CalcularSiguientePago(item.Flexible.PrimaBasicaUdis, desde, hasta, item.FormaPago, pagosUdis)
		nextPaymentIDs = append(nextPaymentIDs, polizaID)
		nextPaymentDates = append(nextPaymentDates, cobertura.NextPayment)
	}

	if len(flexPolizaIDs) > 0 {
		queryAnualidad := `
			INSERT INTO polizas_flexible_anualidad (poliza_id, prima_basica_udis, anualidad_desde, anualidad_hasta)
			SELECT * FROM UNNEST($1::bigint[], $2::numeric[], $3::timestamptz[], $4::timestamptz[]);`

		_, err = tx.Exec(queryAnualidad,
			pq.Array(flexPolizaIDs), pq.Array(flexPrimaBasica), pq.Array(flexDesde), pq.Array(flexHasta),
		)
		if err != nil {
			services.HandleResponseError(http.StatusConflict, "No se ha podido guardar la anualidad de pólizas flexibles", w)
			return
		}
	}

	if len(pagoPolizaIDs) > 0 {
		queryPagos := `
			INSERT INTO polizas_flexible_pagos (poliza_id, fecha_pago, importe_udi)
			SELECT * FROM UNNEST($1::bigint[], $2::timestamptz[], $3::numeric[]);`

		_, err = tx.Exec(queryPagos, pq.Array(pagoPolizaIDs), pq.Array(pagoFechas), pq.Array(pagoImportes))
		if err != nil {
			services.HandleResponseError(http.StatusConflict, "No se ha podido guardar los pagos UDIS", w)
			return
		}
	}

	if len(nextPaymentIDs) > 0 {
		queryNextPayment := `
			INSERT INTO polizas_payments_conf (poliza_id, next_payment)
			SELECT * FROM UNNEST($1::bigint[], $2::timestamptz[]);`

		_, err = tx.Exec(queryNextPayment, pq.Array(nextPaymentIDs), pq.Array(nextPaymentDates))
		if err != nil {
			services.HandleResponseError(http.StatusConflict, "No se ha podido guardar el siguiente pago de pólizas flexibles", w)
			return
		}
	}

	var polizaNums []string
	var fechasPago []time.Time

	for _, item := range itemsToUpload {
		if item.UltimoPago != "" && item.UltimoPago != "null" {
			parts := strings.Split(item.UltimoPago, "-")
			if len(parts) == 3 {
				year, _ := strconv.Atoi(parts[0])
				month, _ := strconv.Atoi(parts[1])
				day, _ := strconv.Atoi(parts[2])
				fecha := time.Date(year, time.Month(month), day, 12, 0, 0, 0, time.UTC)
				polizaNums = append(polizaNums, item.NumPoliza)
				fechasPago = append(fechasPago, fecha)
			}
		}
	}

	if len(polizaNums) > 0 {
		query := `
			UPDATE polizas_payments_conf ppc
			SET next_payment = data.fecha
			FROM UNNEST($1::text[], $2::timestamptz[]) AS data(num, fecha)
			JOIN polizas p ON p.numpoliza = data.num
			WHERE p.poliza_id = ppc.poliza_id;`

		_, err = tx.Exec(query, pq.Array(polizaNums), pq.Array(fechasPago))
		if err != nil {
			services.HandleResponseError(http.StatusConflict, "Error al actualizar pagos", w)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		services.HandleResponseError(http.StatusInternalServerError, "Error al guardar los datos", w)
		return
	}

	response := map[string]any{
		"message": fmt.Sprintf("¡Éxito! Se insertaron %d pólizas con sus respectivos asegurados correctamente.\n", totalInserted),
	}
	services.HandleResponseSuccessWithData(response, w)
}

func ApiPostPoliza(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "POST")

	agenteUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	var item dto.PostItem_Poliza
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), agenteUUID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			services.HandleResponseError(http.StatusNotFound, "El agente no existe en la base de datos", w)
			return
		}
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	aid := int64(agenteID)
	fechaEmision, _ := time.Parse("2006-01-02", item.FechaEmision)
	tipoPoliza := item.TipoPoliza
	if tipoPoliza == "" {
		tipoPoliza = "TRADICIONAL"
	}
	poliza := &models.Poliza{
		DiaCobro:         item.DiaCobro,
		Estatus:          item.Estatus,
		FechaEmision:     fechaEmision,
		FormaPago:        item.FormaPago,
		MedioCobro:       item.MedioCobro,
		NumPoliza:        item.NumPoliza,
		Plan:             item.Plan,
		TipoSeguro:       item.TipoSeguro,
		AddrCalle:        item.Direccion.Calle,
		AddrCodigoPostal: item.Direccion.CodigoPostal,
		AddrCiudad:       item.Direccion.Ciudad,
		AddrColonia:      item.Direccion.Colonia,
		AddrEstado:       item.Direccion.Estado,
		Moneda:           &item.Moneda,
		Telefono:         &item.Telefono,
		SumaAsegurada:    &item.SumaAsegurada,
		Email:            &item.Email,
		Pais:             &item.Pais,
		TipoPoliza:       tipoPoliza,
		AgenteID:         &aid,
	}

	err = deps.PolizaRepo.CreateSingle(r.Context(), poliza)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "23505") || strings.Contains(errMsg, "duplicate") {
			services.Log.ErrorMessage(errMsg)
			services.HandleResponseError(http.StatusConflict, "El número de póliza ya está registrado en el sistema", w)
			return
		}
		services.HandleResponseError(http.StatusInternalServerError, errMsg, w)
		return
	}

	for _, aseg := range item.Asegurados {
		isPrincipal := aseg.IsPrincipal
		pid := int64(poliza.PolizaID)
		birthday, _ := time.Parse(time.RFC3339, aseg.Cumpleanos)
		var birthdayPtr *time.Time
		if !birthday.IsZero() {
			birthdayPtr = &birthday
		}
		newAseg := &models.Asegurado{
			NombreCompleto: aseg.Nombre,
			Birthday:       birthdayPtr,
			IsPrincipal:    &isPrincipal,
			PolizaID:       &pid,
		}
		err = deps.AseguradoRepo.Create(r.Context(), newAseg)
		if err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}
	}

	if tipoPoliza == "FLEXIBLE" && item.Flexible == nil {
		// La extension no pudo capturar el detalle de aportaciones (ej.
		// poliza recien emitida, aun sin tabla de anualidades del lado del
		// asegurador, o fallo de red/timing en el sitio origen). Igual se
		// asegura una fila en polizas_payments_conf, estimando el primer
		// pago como fecha_emision + un periodo, para que la poliza no
		// desaparezca de los listados (que hacen JOIN contra esa tabla) - el
		// siguiente sync exitoso la corrige con datos reales.
		pid := int64(poliza.PolizaID)
		nextPayment := services.PrimerPagoEstimado(fechaEmision, item.FormaPago)
		if err := deps.PolizaRepo.UpsertNextPayment(r.Context(), pid, nextPayment); err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}
	}

	if tipoPoliza == "FLEXIBLE" && item.Flexible != nil {
		desde, errDesde := time.Parse("2006-01-02", item.Flexible.AnualidadDesde)
		hasta, errHasta := time.Parse("2006-01-02", item.Flexible.AnualidadHasta)
		if errDesde != nil || errHasta != nil {
			// Fechas invalidas en el payload capturado: no se aborta la
			// respuesta (la poliza y sus asegurados ya se guardaron), solo se
			// asegura la fila en polizas_payments_conf para que no desaparezca
			// de los listados.
			pid := int64(poliza.PolizaID)
			nextPayment := services.PrimerPagoEstimado(fechaEmision, item.FormaPago)
			if err := deps.PolizaRepo.UpsertNextPayment(r.Context(), pid, nextPayment); err != nil {
				services.Log.ErrorMessage(err.Error())
				services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
				return
			}
			services.HandleResponseSuccess(w)
			return
		}

		pid := int64(poliza.PolizaID)
		anualidad := &models.PolizaFlexibleAnualidad{
			PolizaID:        &pid,
			PrimaBasicaUdis: item.Flexible.PrimaBasicaUdis,
			AnualidadDesde:  desde,
			AnualidadHasta:  hasta,
		}
		if err := deps.PolizaFlexibleRepo.UpsertAnualidad(r.Context(), anualidad); err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}

		var pagos []models.PolizaFlexiblePago
		var pagosUdis []float64
		for _, p := range item.Flexible.Pagos {
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
		if err := deps.PolizaFlexibleRepo.ReplacePagos(r.Context(), pid, pagos); err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}

		cobertura := services.CalcularSiguientePago(item.Flexible.PrimaBasicaUdis, desde, hasta, item.FormaPago, pagosUdis)
		if err := deps.PolizaRepo.UpsertNextPayment(r.Context(), pid, cobertura.NextPayment); err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}
	}

	services.HandleResponseSuccess(w)
}

func ApiPatchPoliza(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "PATCH")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	var item dto.PatchItem_Poliza
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		services.HandleResponseError(http.StatusBadRequest, "Error decodificando JSON", w)
		return
	}

	if item.NumPoliza == "" {
		services.HandleResponseError(http.StatusBadRequest, "Número de póliza requerido", w)
		return
	}

	fields := make(map[string]interface{})

	if item.DiaCobro != nil {
		if *item.DiaCobro < 0 || *item.DiaCobro > 31 {
			services.HandleResponseError(http.StatusBadRequest, "Día de cobro inválido (debe ser entre 0 y 31)", w)
			return
		}
		fields["dia_cobro"] = *item.DiaCobro
	}

	if item.Telefono != nil {
		fields["telefono"] = *item.Telefono
	}

	if item.Email != nil {
		email := strings.TrimSpace(*item.Email)
		if email != "" {
			if _, err := mail.ParseAddress(email); err != nil {
				services.HandleResponseError(http.StatusBadRequest, "Email inválido", w)
				return
			}
		}
		fields["email"] = email
	}

	if item.FormaPago != nil {
		fp := *item.FormaPago
		if fp != "MENSUAL" && fp != "TRIMESTRAL" && fp != "SEMESTRAL" && fp != "ANUAL" {
			services.HandleResponseError(http.StatusBadRequest, "Forma de pago inválida (MENSUAL, TRIMESTRAL, SEMESTRAL, ANUAL)", w)
			return
		}
		fields["forma_pago"] = fp
	}

	if item.Estatus != nil {
		est := *item.Estatus
		if est != "En Vigor" && est != "Anulada" {
			services.HandleResponseError(http.StatusBadRequest, "Estatus inválido (En Vigor, Anulada)", w)
			return
		}
		fields["estatus"] = est
	}

	if len(fields) == 0 {
		services.HandleResponseError(http.StatusBadRequest, "No se proporcionaron campos para actualizar", w)
		return
	}

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusConflict, "Error obteniendo información del agente", w)
		return
	}

	if err := deps.PolizaRepo.UpdatePolizaFields(r.Context(), item.NumPoliza, agenteID, fields, deps.AuditRepo); err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusConflict, "Error actualizando póliza", w)
		return
	}

	services.HandleResponseSuccess(w)
}

func ApiGetDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)
	var details dto.PolizasUserDetails

	err := deps.DB.WithContext(r.Context()).Raw(`
		SELECT
			COALESCE(COUNT(*), 0) as total,
			COALESCE(COUNT(CASE WHEN p.estatus = 'En Vigor' THEN 1 END), 0) as activas,
			COALESCE(COUNT(CASE WHEN p.estatus != 'En Vigor' THEN 1 END), 0) as inactivas,
			COALESCE(COUNT(CASE WHEN ppc.next_payment <= CURRENT_DATE + INTERVAL '5 days' AND p.estatus != 'Anulada' THEN 1 END), 0) as por_vencer,
			COALESCE(COUNT(CASE WHEN ppc.next_payment >= CURRENT_DATE + INTERVAL '5 days' AND ppl.paid_period IS NOT NULL THEN 1 END), 0) as cobertura_activa,
			COALESCE(COUNT(CASE WHEN ppl.paid_period IS NULL THEN 1 END), 0) as sin_pago_registrado
		FROM polizas p
		JOIN agentes a ON p.agente_id = a.agente_id
		JOIN polizas_payments_conf ppc ON p.poliza_id = ppc.poliza_id
		LEFT JOIN (
				SELECT DISTINCT ON (poliza_id) poliza_id, paid_period
				FROM polizas_payments_log
				ORDER BY poliza_id, payment_log_id DESC
			) ppl ON ppl.poliza_id = p.poliza_id
		WHERE a.agente_uuid = ?`, userUUID).
		Scan(&details).Error
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error al recopilar las métricas del dashboard", w)
		return
	}

	err = deps.DB.WithContext(r.Context()).Raw(`
		SELECT COUNT(*)
		FROM polizas p
		JOIN agentes a ON p.agente_id = a.agente_id
		WHERE a.agente_uuid = ?
		AND p.last_modified >= NOW() - INTERVAL '7 days'`, userUUID).
		Scan(&details.Recientes).Error
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, "Error al recopilar recientes", w)
		return
	}

	services.HandleResponseSuccessWithData(details, w)
}

func ApiGetPolizasIds(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	polizasIDs, err := deps.PolizaRepo.GetNumPolizasByAgenteUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	if polizasIDs == nil {
		polizasIDs = []string{}
	}

	services.HandleResponseSuccessWithData(map[string]any{"polizas": polizasIDs}, w)
}

func ApiGetPoliza(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	agenteUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)
	polizaNum := chi.URLParam(r, "polizaNum")

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), agenteUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	var cobranza dto.GetItem_Poliza
	var polizaID int

	err = deps.DB.WithContext(r.Context()).Raw(`
		SELECT p.poliza_uuid, p.dia_cobro, p.estatus, p.fecha_emision, p.forma_pago, p.medio_cobro,
			p.numpoliza, p.plan, p.tipo_seguro,
			COALESCE(p.addr_calle, 'No definido'), COALESCE(p.addr_codigopostal, '00000'),
			COALESCE(p.addr_ciudad, 'No definido'), COALESCE(p.addr_colonia, 'No definido'),
			COALESCE(p.addr_estado, 'No definido'), COALESCE(p.moneda, ''), COALESCE(p.pais, ''),
			COALESCE(p.email, ''), COALESCE(p.telefono, ''), ppc.next_payment, p.poliza_id, p.tipo_poliza
		FROM polizas p
		JOIN polizas_payments_conf ppc ON p.poliza_id = ppc.poliza_id
		JOIN agentes a ON p.agente_id = a.agente_id
		WHERE p.numpoliza = ? AND a.agente_id = ?`, polizaNum, agenteID).
		Row().Scan(&cobranza.PolizaUUID, &cobranza.DiaCobro,
		&cobranza.Estatus, &cobranza.FechaEmision, &cobranza.FormaPago, &cobranza.MedioCobro,
		&cobranza.NumPoliza, &cobranza.Plan, &cobranza.TipoSeguro,
		&cobranza.Direccion.Calle, &cobranza.Direccion.CodigoPostal, &cobranza.Direccion.Ciudad,
		&cobranza.Direccion.Colonia, &cobranza.Direccion.Estado, &cobranza.Moneda, &cobranza.Pais,
		&cobranza.Email, &cobranza.Telefono, &cobranza.SiguientePago, &polizaID, &cobranza.TipoPoliza)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			services.HandleResponseError(http.StatusNotFound, "La poliza no está registrada", w)
			return
		}
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	if cobranza.TipoPoliza == "FLEXIBLE" {
		anualidad, pagos, err := deps.PolizaFlexibleRepo.GetByPolizaID(r.Context(), int64(polizaID))
		if err != nil {
			services.Log.ErrorMessage(err.Error())
		} else if anualidad != nil {
			var pagosUdis []float64
			var pagosOut []dto.GetItem_PolizaFlexiblePago
			for _, p := range pagos {
				pagosUdis = append(pagosUdis, p.ImporteUdi)
				pagosOut = append(pagosOut, dto.GetItem_PolizaFlexiblePago{
					Fecha:      p.FechaPago.UTC().Format("2006-01-02"),
					ImporteUdi: p.ImporteUdi,
				})
			}
			cobertura := services.CalcularSiguientePago(
				anualidad.PrimaBasicaUdis, anualidad.AnualidadDesde, anualidad.AnualidadHasta,
				cobranza.FormaPago, pagosUdis,
			)
			cobranza.Flexible = &dto.GetItem_PolizaFlexible{
				PrimaBasicaUdis: anualidad.PrimaBasicaUdis,
				AnualidadDesde:  anualidad.AnualidadDesde.UTC().Format("2006-01-02"),
				AnualidadHasta:  anualidad.AnualidadHasta.UTC().Format("2006-01-02"),
				TotalPagadoUdis: cobertura.TotalPagadoUdis,
				UdisFaltantes:   cobertura.UdisFaltantes,
				Pagos:           pagosOut,
			}
		}
	}

	asegurados, err := deps.AseguradoRepo.FindByPolizaID(r.Context(), polizaID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	for _, a := range asegurados {
		birthdayStr := ""
		if a.Birthday != nil {
			birthdayStr = a.Birthday.Format(time.RFC3339)
		}
		isPrincipal := false
		if a.IsPrincipal != nil {
			isPrincipal = *a.IsPrincipal
		}
		cobranza.Asegurados = append(cobranza.Asegurados, dto.Asegurado{
			Nombre:      a.NombreCompleto,
			Cumpleanos:  birthdayStr,
			IsPrincipal: isPrincipal,
		})
	}

	if cobranza.NumPoliza == "" {
		services.HandleResponseError(http.StatusNotFound, "La poliza no está registrada", w)
		return
	}

	services.HandleResponseSuccessWithData(cobranza, w)
}

func ApiGetPolizas(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)
	var filters dto.GetItem_Poliza_Filters
	filters.Filters = make(map[string]string)

	queryParams := r.URL.Query()
	pageSize, _ := strconv.Atoi(queryParams.Get("pageSize"))
	currentPage, _ := strconv.Atoi(queryParams.Get("currentPage"))

	if pageSize <= 0 {
		pageSize = 10
	}
	if currentPage <= 0 {
		currentPage = 1
	}

	filters.PageSize = pageSize
	filters.CurentPage = currentPage

	if nextDue := queryParams.Get("next_due"); nextDue != "" {
		filters.Filters["next_due"] = nextDue
	}
	if numPoliza := queryParams.Get("numpoliza"); numPoliza != "" {
		filters.Filters["numpoliza"] = numPoliza
	}
	if status := queryParams.Get("estatus"); status != "" {
		filters.Filters["estatus"] = status
	} else if showAnuladas := queryParams.Get("show_anuladas"); showAnuladas == "true" {
		filters.Filters["estatus"] = "En Vigor"
	}

	nombreAsegurado := queryParams.Get("nombre_asegurado")
	recent := queryParams.Get("recent") == "true"

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}
	filters.Agente_id = agenteID

	// Keep raw SQL for the complex dynamic query builder
	sqlDB, err := deps.DB.DB()
	if err != nil {
		services.HandleResponseError(http.StatusInternalServerError, "Error de conexión", w)
		return
	}

	joinClause := ` FROM polizas p
		JOIN agentes a ON p.agente_id = a.agente_id
		JOIN polizas_payments_conf ppc ON ppc.poliza_id=p.poliza_id
		LEFT JOIN (
			SELECT DISTINCT ON (poliza_id) poliza_id, paid_period
			FROM polizas_payments_log
			ORDER BY poliza_id, payment_log_id DESC
		) ppl ON ppl.poliza_id = p.poliza_id`

	if nombreAsegurado != "" {
		joinClause += ` JOIN asegurados a_filter ON a_filter.poliza_id = p.poliza_id AND a_filter.is_principal = true`
	}

	baseQuery := joinClause + ` WHERE a.agente_id=$1`

	args := []any{filters.Agente_id}
	argCount := 1

	for columna, valor := range filters.Filters {
		if valor == "" {
			continue
		}
		if columna == "next_due" && valor == "true" {
			baseQuery += ` AND ppc.next_payment <= NOW() + INTERVAL '5 days'`
		} else if columna == "numpoliza" {
			argCount++
			baseQuery += fmt.Sprintf(" AND p.numpoliza ILIKE $%d", argCount)
			args = append(args, fmt.Sprintf("%%%s%%", valor))
		} else {
			argCount++
			baseQuery += fmt.Sprintf(" AND p.%s=$%d", columna, argCount)
			args = append(args, valor)
		}
	}

	if nombreAsegurado != "" {
		argCount++
		baseQuery += fmt.Sprintf(` AND LOWER(a_filter.nombre_completo) LIKE LOWER($%d)`, argCount)
		args = append(args, "%"+nombreAsegurado+"%")
	}

	var totalRecords int
	err = sqlDB.QueryRow("SELECT COUNT(*) "+baseQuery, args...).Scan(&totalRecords)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	offset := filters.PageSize * (filters.CurentPage - 1)
	totalPages := int(math.Ceil(float64(totalRecords) / float64(filters.PageSize)))
	if totalPages <= 0 {
		totalPages = 1
	}

	selectQuery := `
		SELECT p.poliza_id, p.dia_cobro, p.estatus, p.fecha_emision, p.forma_pago,
			p.medio_cobro, p.numpoliza, p.plan, p.tipo_seguro,
			COALESCE(p.addr_calle, 'No definido'), COALESCE(p.addr_codigopostal, '00000'),
			COALESCE(p.addr_ciudad, 'No definido'), COALESCE(p.addr_colonia, 'No definido'),
			COALESCE(p.addr_estado, 'No definido'),
			ppc.next_payment, COALESCE(p.moneda, ''), COALESCE(p.pais, ''),
			COALESCE(p.telefono, ''), COALESCE(p.email, ''), COALESCE(p.suma_asegurada, ''),
			p.last_modified, p.poliza_uuid, COALESCE(ppl.paid_period::text, '') as "payment_exist",
			p.tipo_poliza` + baseQuery

	orderBy := `ppc.next_payment ASC`
	if recent {
		orderBy = `p.last_modified DESC`
	}
	selectQuery += fmt.Sprintf(` ORDER BY %s LIMIT $%d OFFSET $%d`, orderBy, argCount+1, argCount+2)
	args = append(args, filters.PageSize, offset)

	rows, err := sqlDB.Query(selectQuery, args...)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}
	defer rows.Close()

	var polizas []dto.GetItem_Poliza
	var targetPolizaIDs []int

	for rows.Next() {
		var poliza dto.GetItem_Poliza
		var dbPolizaID int

		err := rows.Scan(
			&dbPolizaID, &poliza.DiaCobro, &poliza.Estatus, &poliza.FechaEmision, &poliza.FormaPago, &poliza.MedioCobro, &poliza.NumPoliza,
			&poliza.Plan, &poliza.TipoSeguro, &poliza.Direccion.Calle, &poliza.Direccion.CodigoPostal, &poliza.Direccion.Ciudad,
			&poliza.Direccion.Colonia, &poliza.Direccion.Estado, &poliza.SiguientePago, &poliza.Moneda, &poliza.Pais,
			&poliza.Telefono, &poliza.Email, &poliza.SumaAsegurada, &poliza.UltimaModificacion, &poliza.PolizaUUID,
			&poliza.PaymentExist, &poliza.TipoPoliza,
		)
		if err != nil {
			rows.Close()
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}

		poliza.Asegurados = []dto.Asegurado{}
		polizas = append(polizas, poliza)
		targetPolizaIDs = append(targetPolizaIDs, dbPolizaID)
	}

	if polizas == nil {
		polizas = []dto.GetItem_Poliza{}
	}

	if len(targetPolizaIDs) > 0 {
		aseguradosMapa := make(map[string][]dto.Asegurado)

		aseguradosRows, err := sqlDB.Query(`
			SELECT a.nombre_completo, a.birthday, a.is_principal, p.numpoliza
			FROM asegurados a
			JOIN polizas p ON a.poliza_id = p.poliza_id
			WHERE p.poliza_id = ANY($1)`, pq.Array(targetPolizaIDs))
		if err != nil {
			services.Log.ErrorMessage(err.Error())
			services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
			return
		}
		defer aseguradosRows.Close()

		for aseguradosRows.Next() {
			var asegData dto.Asegurado
			var numPolizaKey string

			err := aseguradosRows.Scan(&asegData.Nombre, &asegData.Cumpleanos, &asegData.IsPrincipal, &numPolizaKey)
			if err != nil {
				aseguradosRows.Close()
				services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
				return
			}
			aseguradosMapa[numPolizaKey] = append(aseguradosMapa[numPolizaKey], asegData)
		}

		for i := range polizas {
			if lista, exists := aseguradosMapa[polizas[i].NumPoliza]; exists {
				polizas[i].Asegurados = lista
			}
		}

		polizaIDs64 := make([]int64, len(targetPolizaIDs))
		for i, id := range targetPolizaIDs {
			polizaIDs64[i] = int64(id)
		}

		anualidades, pagosMap, err := deps.PolizaFlexibleRepo.GetByPolizaIDs(r.Context(), polizaIDs64)
		if err != nil {
			services.Log.ErrorMessage(err.Error())
		} else {
			for i := range polizas {
				if polizas[i].TipoPoliza != "FLEXIBLE" {
					continue
				}
				pid := int64(targetPolizaIDs[i])
				anualidad, ok := anualidades[pid]
				if !ok {
					continue
				}
				var pagosUdis []float64
				var pagosOut []dto.GetItem_PolizaFlexiblePago
				for _, p := range pagosMap[pid] {
					pagosUdis = append(pagosUdis, p.ImporteUdi)
					pagosOut = append(pagosOut, dto.GetItem_PolizaFlexiblePago{
						Fecha:      p.FechaPago.UTC().Format("2006-01-02"),
						ImporteUdi: p.ImporteUdi,
					})
				}
				cobertura := services.CalcularSiguientePago(
					anualidad.PrimaBasicaUdis, anualidad.AnualidadDesde, anualidad.AnualidadHasta,
					polizas[i].FormaPago, pagosUdis,
				)
				polizas[i].Flexible = &dto.GetItem_PolizaFlexible{
					PrimaBasicaUdis: anualidad.PrimaBasicaUdis,
					AnualidadDesde:  anualidad.AnualidadDesde.UTC().Format("2006-01-02"),
					AnualidadHasta:  anualidad.AnualidadHasta.UTC().Format("2006-01-02"),
					TotalPagadoUdis: cobertura.TotalPagadoUdis,
					UdisFaltantes:   cobertura.UdisFaltantes,
					Pagos:           pagosOut,
				}
			}
		}
	}

	response := map[string]any{"items": polizas, "total": totalRecords, "pages": totalPages}
	services.HandleResponseSuccessWithData(response, w)
}

func ApiGetBirthdates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	userUUID, _ := r.Context().Value(middlewares.UserIDKey).(string)

	agenteID, err := deps.AgenteRepo.FindIDByUUID(r.Context(), userUUID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	results, err := deps.PolizaRepo.GetBirthdates(r.Context(), agenteID)
	if err != nil {
		services.Log.ErrorMessage(err.Error())
		services.HandleResponseError(http.StatusInternalServerError, err.Error(), w)
		return
	}

	var birthdates []dto.AseguradoBirthdate
	for _, r := range results {
		birthdates = append(birthdates, dto.AseguradoBirthdate{
			NombreCompleto: r.NombreCompleto,
			Birthdate:      r.NextBirthday,
			Numpoliza:      r.NumPoliza,
		})
	}

	services.HandleResponseSuccessWithData(birthdates, w)
}
