package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

// PorVencerConditionSQL es el criterio del contador "Por vencer" del
// dashboard (ApiGetDetails). Requiere JOIN a "agentes a" y
// "polizas_payments_conf ppc".
const PorVencerConditionSQL = "ppc.next_payment <= CURRENT_DATE + " + NextDueWindowSQL + " AND p.estatus != 'Anulada'"

// porVencerCountSQL cuenta las polizas por vencer de un agente (?).
var porVencerCountSQL = fmt.Sprintf(`(
	SELECT COUNT(*) FROM polizas p
	JOIN agentes a ON p.agente_id = a.agente_id
	JOIN polizas_payments_conf ppc ON p.poliza_id = ppc.poliza_id
	WHERE p.agente_id = ? AND %s)`, PorVencerConditionSQL)

// SyncRunSummary es un sync_run con el conteo de sus eventos por tipo.
type SyncRunSummary struct {
	models.SyncRun
	Pagos   int `gorm:"column:pagos" json:"pagos"`
	Estatus int `gorm:"column:estatus" json:"estatus"`
	Altas   int `gorm:"column:altas" json:"altas"`
}

// SyncEventoDetalle es un evento con los datos de la poliza para mostrarlo.
type SyncEventoDetalle struct {
	Tipo          string    `gorm:"column:tipo" json:"tipo"`
	ValorAnterior *string   `gorm:"column:valor_anterior" json:"valor_anterior"`
	ValorNuevo    *string   `gorm:"column:valor_nuevo" json:"valor_nuevo"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
	NumPoliza     string    `gorm:"column:numpoliza" json:"numpoliza"`
	PolizaUUID    string    `gorm:"column:poliza_uuid" json:"poliza_uuid"`
	Asegurado     string    `gorm:"column:asegurado" json:"asegurado"`
}

type SyncRepository interface {
	StartRun(ctx context.Context, agenteID int, tipo string) (*models.SyncRun, error)
	FinishRun(ctx context.Context, syncID, agenteID int, estado string) (bool, error)
	// OwnedSyncID devuelve syncID si existe y es del agente; nil en otro caso
	// (incluido syncID nil), para no ligar eventos a runs ajenos.
	OwnedSyncID(ctx context.Context, syncID *int, agenteID int) *int
	LogEventos(ctx context.Context, eventos []models.SyncEvento) error
	GetNextPayment(ctx context.Context, polizaID int64) (*time.Time, error)
	ListRuns(ctx context.Context, agenteID, limit int) ([]SyncRunSummary, error)
	GetRunEventos(ctx context.Context, syncID, agenteID int) ([]SyncEventoDetalle, error)
}

type syncRepository struct {
	db *gorm.DB
}

func NewSyncRepository(db *gorm.DB) SyncRepository {
	return &syncRepository{db: db}
}

func (r *syncRepository) StartRun(ctx context.Context, agenteID int, tipo string) (*models.SyncRun, error) {
	var run models.SyncRun
	err := r.db.WithContext(ctx).Raw(`
		INSERT INTO sync_runs (agente_id, tipo, por_vencer_antes)
		VALUES (?, ?, `+porVencerCountSQL+`)
		RETURNING *`, agenteID, tipo, agenteID).
		Scan(&run).Error
	if err != nil {
		return nil, err
	}
	return &run, nil
}

func (r *syncRepository) FinishRun(ctx context.Context, syncID, agenteID int, estado string) (bool, error) {
	res := r.db.WithContext(ctx).Exec(`
		UPDATE sync_runs
		SET estado = ?, finished_at = now(), por_vencer_despues = `+porVencerCountSQL+`
		WHERE sync_id = ? AND agente_id = ?`, estado, agenteID, syncID, agenteID)
	return res.RowsAffected > 0, res.Error
}

func (r *syncRepository) OwnedSyncID(ctx context.Context, syncID *int, agenteID int) *int {
	if syncID == nil {
		return nil
	}
	var count int64
	err := r.db.WithContext(ctx).Model(&models.SyncRun{}).
		Where("sync_id = ? AND agente_id = ?", *syncID, agenteID).
		Count(&count).Error
	if err != nil || count == 0 {
		return nil
	}
	return syncID
}

func (r *syncRepository) LogEventos(ctx context.Context, eventos []models.SyncEvento) error {
	if len(eventos) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&eventos).Error
}

func (r *syncRepository) GetNextPayment(ctx context.Context, polizaID int64) (*time.Time, error) {
	var next *time.Time
	err := r.db.WithContext(ctx).Raw(
		"SELECT next_payment FROM polizas_payments_conf WHERE poliza_id = ?", polizaID,
	).Row().Scan(&next)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return next, err
}

func (r *syncRepository) ListRuns(ctx context.Context, agenteID, limit int) ([]SyncRunSummary, error) {
	var runs []SyncRunSummary
	err := r.db.WithContext(ctx).Raw(`
		SELECT sr.*,
			COUNT(se.evento_id) FILTER (WHERE se.tipo = 'pago')    AS pagos,
			COUNT(se.evento_id) FILTER (WHERE se.tipo = 'estatus') AS estatus,
			COUNT(se.evento_id) FILTER (WHERE se.tipo = 'alta')    AS altas
		FROM sync_runs sr
		LEFT JOIN sync_eventos se ON se.sync_id = sr.sync_id
		WHERE sr.agente_id = ?
		GROUP BY sr.sync_id
		ORDER BY sr.started_at DESC
		LIMIT ?`, agenteID, limit).
		Scan(&runs).Error
	return runs, err
}

func (r *syncRepository) GetRunEventos(ctx context.Context, syncID, agenteID int) ([]SyncEventoDetalle, error) {
	var eventos []SyncEventoDetalle
	err := r.db.WithContext(ctx).Raw(`
		SELECT se.tipo, se.valor_anterior, se.valor_nuevo, se.created_at,
			p.numpoliza, p.poliza_uuid::text AS poliza_uuid,
			COALESCE((
				SELECT a.nombre_completo FROM asegurados a
				WHERE a.poliza_id = p.poliza_id
				ORDER BY a.is_principal IS TRUE DESC, a.asegurado_id ASC
				LIMIT 1
			), '') AS asegurado
		FROM sync_eventos se
		JOIN polizas p ON p.poliza_id = se.poliza_id
		WHERE se.sync_id = ? AND se.agente_id = ?
		ORDER BY se.tipo, p.numpoliza`, syncID, agenteID).
		Scan(&eventos).Error
	return eventos, err
}
