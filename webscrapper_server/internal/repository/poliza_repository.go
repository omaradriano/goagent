package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

// NextDueWindowSQL expresa la ventana de "próximas a vencer" en días
// configurables por agente (agentes.daysuntiladvice). Requiere que la query
// que la usa ya tenga un JOIN a "agentes a".
const NextDueWindowSQL = "make_interval(days => a.daysuntiladvice)"

type BirthdateResult struct {
	NombreCompleto string
	NextBirthday   string
	NumPoliza      string
}

type PolizaRepository interface {
	FindByNumPoliza(ctx context.Context, numPoliza string, agenteID int) (*models.Poliza, error)
	GetNumPolizasByAgenteUUID(ctx context.Context, uuid string) ([]string, error)
	BulkCreate(ctx context.Context, polizas []models.Poliza, asegurados [][]models.Asegurado) ([]int64, []string, error)
	CreateSingle(ctx context.Context, poliza *models.Poliza) error
	FindPolizaIDByNumPoliza(ctx context.Context, numPoliza string) (int, error)
	GetPolizaWithAsegurados(ctx context.Context, numPoliza string, agenteID int) (*models.Poliza, error)
	GetBirthdates(ctx context.Context, agenteID int) ([]BirthdateResult, error)
	UpdatePolizaFields(ctx context.Context, numPoliza string, agenteID int, fields map[string]interface{}, auditRepo AuditRepository) error
	UpdatePolizaFieldsByID(ctx context.Context, polizaID int, fields map[string]interface{}, changedBy int, auditRepo AuditRepository) error
	UpsertNextPayment(ctx context.Context, polizaID int64, nextPayment time.Time) error
	RecalcNextPaymentFromEmision(ctx context.Context, polizaID int64) error
	GetResyncCandidateNums(ctx context.Context, agenteID int) ([]string, error)
	GetAllNumPolizaEstatus(ctx context.Context, agenteID int) ([]NumEstatus, error)
}

// NumEstatus es la proyeccion barata numpoliza+estatus usada para el diff
// de reconciliacion de resync contra la grilla en vivo.
type NumEstatus struct {
	NumPoliza string
	Estatus   string
}

type polizaRepository struct {
	db *gorm.DB
}

func NewPolizaRepository(db *gorm.DB) PolizaRepository {
	return &polizaRepository{db: db}
}

func (r *polizaRepository) FindByNumPoliza(ctx context.Context, numPoliza string, agenteID int) (*models.Poliza, error) {
	var poliza models.Poliza
	err := r.db.WithContext(ctx).
		Where("numpoliza = ? AND agente_id = ?", numPoliza, agenteID).
		First(&poliza).Error
	if err != nil {
		return nil, err
	}
	return &poliza, nil
}

func (r *polizaRepository) GetNumPolizasByAgenteUUID(ctx context.Context, uuid string) ([]string, error) {
	var results []string
	err := r.db.WithContext(ctx).
		Model(&models.Poliza{}).
		Joins("JOIN agentes a ON polizas.agente_id = a.agente_id").
		Where("a.agente_uuid = ?", uuid).
		Pluck("numpoliza", &results).Error
	return results, err
}

func (r *polizaRepository) BulkCreate(ctx context.Context, polizas []models.Poliza, asegurados [][]models.Asegurado) ([]int64, []string, error) {
	var ids []int64
	var nums []string

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, poliza := range polizas {
			if err := tx.Create(&poliza).Error; err != nil {
				return err
			}
			ids = append(ids, int64(poliza.PolizaID))
			nums = append(nums, poliza.NumPoliza)

			if i < len(asegurados) {
				for j := range asegurados[i] {
					pid := int64(poliza.PolizaID)
					asegurados[i][j].PolizaID = &pid
				}
				if len(asegurados[i]) > 0 {
					if err := tx.Create(&asegurados[i]).Error; err != nil {
						return err
					}
				}
			}
		}
		return nil
	})

	return ids, nums, err
}

func (r *polizaRepository) CreateSingle(ctx context.Context, poliza *models.Poliza) error {
	return r.db.WithContext(ctx).Create(poliza).Error
}

func (r *polizaRepository) FindPolizaIDByNumPoliza(ctx context.Context, numPoliza string) (int, error) {
	var poliza models.Poliza
	err := r.db.WithContext(ctx).Select("poliza_id").Where("numpoliza = ?", numPoliza).First(&poliza).Error
	if err != nil {
		return 0, err
	}
	return poliza.PolizaID, nil
}

func (r *polizaRepository) GetPolizaWithAsegurados(ctx context.Context, numPoliza string, agenteID int) (*models.Poliza, error) {
	var poliza models.Poliza
	err := r.db.WithContext(ctx).
		Preload("Asegurados").
		Preload("PaymentConf").
		Joins("JOIN agentes a ON polizas.agente_id = a.agente_id").
		Where("polizas.numpoliza = ? AND a.agente_id = ?", numPoliza, agenteID).
		First(&poliza).Error
	if err != nil {
		return nil, err
	}
	return &poliza, nil
}

// polizaAuditSnapshot captura el valor "antes" de cada columna actualizable
// de polizas, para el diff de auditoria en UpdatePolizaFields/
// UpdatePolizaFieldsByID. Cubre todas las columnas planas que puede tocar un
// refresco completo (ApiPutPoliza), no solo el subconjunto de 5 campos que
// edita manualmente ApiPatchPoliza - de lo contrario un refresco que cambia
// ej. "plan" o "addr_calle" no quedaria auditado.
func polizaAuditSnapshot(p *models.Poliza) map[string]string {
	snapshot := map[string]string{
		"dia_cobro":         fmt.Sprintf("%d", p.DiaCobro),
		"estatus":           p.Estatus,
		"fecha_emision":     p.FechaEmision.Format("2006-01-02"),
		"forma_pago":        p.FormaPago,
		"medio_cobro":       p.MedioCobro,
		"plan":              p.Plan,
		"tipo_seguro":       p.TipoSeguro,
		"addr_calle":        p.AddrCalle,
		"addr_codigopostal": p.AddrCodigoPostal,
		"addr_ciudad":       p.AddrCiudad,
		"addr_colonia":      p.AddrColonia,
		"addr_estado":       p.AddrEstado,
		"tipo_poliza":       p.TipoPoliza,
	}
	strPtrFields := map[string]*string{
		"telefono":       p.Telefono,
		"email":          p.Email,
		"moneda":         p.Moneda,
		"pais":           p.Pais,
		"suma_asegurada": p.SumaAsegurada,
		"comentario":     p.Comentario,
	}
	for k, v := range strPtrFields {
		if v != nil {
			snapshot[k] = *v
		} else {
			snapshot[k] = ""
		}
	}
	return snapshot
}

func (r *polizaRepository) UpdatePolizaFields(ctx context.Context, numPoliza string, agenteID int, fields map[string]interface{}, auditRepo AuditRepository) error {
	var poliza models.Poliza
	if err := r.db.WithContext(ctx).
		Where("numpoliza = ? AND agente_id = ?", numPoliza, agenteID).
		First(&poliza).Error; err != nil {
		return err
	}

	oldFields := polizaAuditSnapshot(&poliza)

	result := r.db.WithContext(ctx).
		Model(&models.Poliza{}).
		Where("numpoliza = ? AND agente_id = ?", numPoliza, agenteID).
		Updates(fields)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	newFields := make(map[string]string, len(fields))
	for k, v := range fields {
		newFields[k] = fmt.Sprintf("%v", v)
	}

	if auditRepo != nil {
		_ = auditRepo.LogPolizaChanges(ctx, poliza.PolizaID, oldFields, newFields, agenteID, "api")
	}

	return nil
}

func (r *polizaRepository) UpdatePolizaFieldsByID(ctx context.Context, polizaID int, fields map[string]interface{}, changedBy int, auditRepo AuditRepository) error {
	var poliza models.Poliza
	if err := r.db.WithContext(ctx).
		Where("poliza_id = ?", polizaID).
		First(&poliza).Error; err != nil {
		return err
	}

	oldFields := polizaAuditSnapshot(&poliza)

	result := r.db.WithContext(ctx).
		Model(&models.Poliza{}).
		Where("poliza_id = ?", polizaID).
		Updates(fields)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	newFields := make(map[string]string, len(fields))
	for k, v := range fields {
		newFields[k] = fmt.Sprintf("%v", v)
	}

	if auditRepo != nil {
		_ = auditRepo.LogPolizaChanges(ctx, poliza.PolizaID, oldFields, newFields, changedBy, "revert")
	}

	return nil
}

// UpsertNextPayment crea o actualiza la fila de polizas_payments_conf para una
// poliza. polizas_payments_conf no tiene constraint UNIQUE en poliza_id (el
// procedimiento SQL fn__set_next_payment tampoco confia en uno), por lo que se
// hace un check-then-branch manual en vez de ON CONFLICT.
func (r *polizaRepository) UpsertNextPayment(ctx context.Context, polizaID int64, nextPayment time.Time) error {
	var existing models.PaymentConf
	err := r.db.WithContext(ctx).Where("poliza_id = ?", polizaID).First(&existing).Error
	if err == nil {
		return r.db.WithContext(ctx).
			Model(&models.PaymentConf{}).
			Where("poliza_id = ?", polizaID).
			Update("next_payment", nextPayment).Error
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}

	pid := polizaID
	return r.db.WithContext(ctx).Create(&models.PaymentConf{PolizaID: &pid, NextPayment: &nextPayment}).Error
}

// RecalcNextPaymentFromEmision recalcula next_payment con el procedimiento
// fn__set_next_payment partiendo de la fecha_emision guardada (mismo calculo
// que el trigger de alta): avanza por forma_pago hasta pasar NOW(), aplica
// dia_cobro y ajuste de fin de semana. Se usa en polizas tradicionales sin
// recibos pendientes, donde no hay fecha de recibo que tomar.
func (r *polizaRepository) RecalcNextPaymentFromEmision(ctx context.Context, polizaID int64) error {
	// Postgres no permite subqueries como argumentos de CALL, por eso se leen
	// antes uuid y fecha_emision.
	var row struct {
		PolizaUUID   string
		FechaEmision time.Time
	}
	err := r.db.WithContext(ctx).Raw(
		"SELECT poliza_uuid, fecha_emision FROM polizas WHERE poliza_id = ?", polizaID,
	).Scan(&row).Error
	if err != nil {
		return err
	}
	if row.PolizaUUID == "" {
		return fmt.Errorf("no se encontro la poliza %d para recalcular next_payment", polizaID)
	}
	return r.db.WithContext(ctx).Exec(
		"CALL fn__set_next_payment(?::uuid, ?::timestamptz)", row.PolizaUUID, row.FechaEmision,
	).Error
}

// GetResyncCandidateNums devuelve los numpoliza cuyo next_payment cae dentro
// de la ventana daysuntiladvice del agente (mismo criterio que "por_vencer"
// en ApiGetDetails), excluyendo Anuladas.
func (r *polizaRepository) GetResyncCandidateNums(ctx context.Context, agenteID int) ([]string, error) {
	var nums []string
	err := r.db.WithContext(ctx).Raw(fmt.Sprintf(`
		SELECT p.numpoliza
		FROM polizas p
		JOIN agentes a ON p.agente_id = a.agente_id
		JOIN polizas_payments_conf ppc ON p.poliza_id = ppc.poliza_id
		WHERE a.agente_id = ?
		  AND p.estatus != 'Anulada'
		  AND ppc.next_payment <= CURRENT_DATE + %s`, NextDueWindowSQL), agenteID).
		Scan(&nums).Error
	return nums, err
}

// GetAllNumPolizaEstatus devuelve numpoliza+estatus de toda la cartera del
// agente, para contrastar contra la grilla en vivo durante el resync.
func (r *polizaRepository) GetAllNumPolizaEstatus(ctx context.Context, agenteID int) ([]NumEstatus, error) {
	var results []NumEstatus
	err := r.db.WithContext(ctx).
		Model(&models.Poliza{}).
		Select("numpoliza as num_poliza, estatus").
		Where("agente_id = ?", agenteID).
		Scan(&results).Error
	return results, err
}

// BirthdayPastDays es cuantos dias hacia atras se siguen mostrando los
// cumpleanos que ya pasaron (el calendario los muestra como "Hace N dias").
const BirthdayPastDays = 10

// GetBirthdates devuelve un cumpleanos por asegurado: la ocurrencia que cae en
// la ventana [hoy - BirthdayPastDays, un ano despues). Los anos se suman como
// intervalo sobre la fecha de nacimiento, asi un 29 de febrero cae en 28 en
// anos no bisiestos (MAKE_DATE fallaba y tumbaba toda la consulta). "Hoy" es
// la fecha en hora de Mexico como date: con NOW() los cumpleanos de hoy ya
// contaban como pasados, y la BD esta en GMT (despues de las 6 pm ya seria
// manana). La fecha de nacimiento se deja en la zona de la sesion, que es como
// se guarda.
func (r *polizaRepository) GetBirthdates(ctx context.Context, agenteID int) ([]BirthdateResult, error) {
	var results []BirthdateResult
	err := r.db.WithContext(ctx).Raw(`
		WITH ventana AS (
		    SELECT ((now() AT TIME ZONE 'America/Mexico_City')::date - ?::int) AS inicio
		),
		birthday_calc AS (
		    SELECT a.nombre_completo, p.numpoliza, a.birthday::date AS nacimiento,
		        (EXTRACT(YEAR FROM v.inicio) - EXTRACT(YEAR FROM a.birthday::date))::int AS anos,
		        v.inicio
		    FROM asegurados a
		    JOIN polizas p ON p.poliza_id = a.poliza_id
		    CROSS JOIN ventana v
		    WHERE p.agente_id = ? AND a.birthday IS NOT NULL
		),
		ocurrencias AS (
		    SELECT nombre_completo, numpoliza, inicio,
		        (nacimiento + make_interval(years => anos))::date AS en_ano_inicio,
		        (nacimiento + make_interval(years => anos + 1))::date AS en_ano_siguiente
		    FROM birthday_calc
		),
		distinct_birthdays AS (
		    SELECT DISTINCT ON (nombre_completo)
		        nombre_completo,
		        CASE WHEN en_ano_inicio < inicio THEN en_ano_siguiente ELSE en_ano_inicio END AS next_birthday,
		        numpoliza
		    FROM ocurrencias
		    ORDER BY nombre_completo, next_birthday ASC
		)
		SELECT nombre_completo, to_char(next_birthday, 'YYYY-MM-DD') AS next_birthday, numpoliza AS num_poliza
		FROM distinct_birthdays
		ORDER BY next_birthday ASC`, BirthdayPastDays, agenteID).
		Scan(&results).Error
	return results, err
}
