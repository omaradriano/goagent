package repository

import (
	"context"
	"fmt"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

type PolizaAuditEntry struct {
	FieldName   string  `gorm:"column:field_name" json:"field_name"`
	OldValue    *string `gorm:"column:old_value" json:"old_value"`
	NewValue    *string `gorm:"column:new_value" json:"new_value"`
	ChangedAt   string  `gorm:"column:changed_at" json:"changed_at"`
	Source      string  `gorm:"column:source" json:"source"`
	NumPoliza   string  `gorm:"column:numpoliza" json:"numpoliza"`
	AgenteEmail string  `gorm:"column:agente_email" json:"agente_email"`
}

type AgenteAuditEntry struct {
	FieldName   string  `gorm:"column:field_name" json:"field_name"`
	OldValue    *string `gorm:"column:old_value" json:"old_value"`
	NewValue    *string `gorm:"column:new_value" json:"new_value"`
	ChangedAt   string  `gorm:"column:changed_at" json:"changed_at"`
	Source      string  `gorm:"column:source" json:"source"`
	AgenteEmail string  `gorm:"column:agente_email" json:"agente_email"`
}

type AuditRepository interface {
	LogPolizaChange(ctx context.Context, polizaID int, fieldName string, oldValue, newValue *string, changedBy int, source string) error
	LogAgenteChange(ctx context.Context, agenteID int, fieldName string, oldValue, newValue *string, changedBy *int, source string) error
	GetPolizaAudit(ctx context.Context, polizaID int, limit, offset int) ([]models.PolizaAuditLog, error)
	GetAgenteAudit(ctx context.Context, agenteID int, limit, offset int) ([]models.AgenteAuditLog, error)
	LogPolizaChanges(ctx context.Context, polizaID int, oldFields, newFields map[string]string, changedBy int, source string) error
	LogAgenteEvent(ctx context.Context, agenteID int, eventName string, changedBy *int, source string) error
	GetAllPolizaAudit(ctx context.Context, limit, offset int) ([]PolizaAuditEntry, error)
	GetAllAgenteAudit(ctx context.Context, limit, offset int) ([]AgenteAuditEntry, error)
}

type auditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) LogPolizaChange(ctx context.Context, polizaID int, fieldName string, oldValue, newValue *string, changedBy int, source string) error {
	entry := models.PolizaAuditLog{
		PolizaID:  polizaID,
		FieldName: fieldName,
		OldValue:  oldValue,
		NewValue:  newValue,
		ChangedBy: &changedBy,
		Source:    source,
	}
	return r.db.WithContext(ctx).Create(&entry).Error
}

func (r *auditRepository) LogAgenteChange(ctx context.Context, agenteID int, fieldName string, oldValue, newValue *string, changedBy *int, source string) error {
	entry := models.AgenteAuditLog{
		AgenteID:  agenteID,
		FieldName: fieldName,
		OldValue:  oldValue,
		NewValue:  newValue,
		ChangedBy: changedBy,
		Source:    source,
	}
	return r.db.WithContext(ctx).Create(&entry).Error
}

func (r *auditRepository) LogPolizaChanges(ctx context.Context, polizaID int, oldFields, newFields map[string]string, changedBy int, source string) error {
	for field, newVal := range newFields {
		oldVal, exists := oldFields[field]
		if !exists || oldVal == newVal {
			continue
		}
		old := oldVal
		nv := newVal
		if err := r.LogPolizaChange(ctx, polizaID, field, &old, &nv, changedBy, source); err != nil {
			return fmt.Errorf("audit log poliza field %s: %w", field, err)
		}
	}
	return nil
}

func (r *auditRepository) LogAgenteEvent(ctx context.Context, agenteID int, eventName string, changedBy *int, source string) error {
	return r.LogAgenteChange(ctx, agenteID, eventName, nil, nil, changedBy, source)
}

func (r *auditRepository) GetPolizaAudit(ctx context.Context, polizaID int, limit, offset int) ([]models.PolizaAuditLog, error) {
	var logs []models.PolizaAuditLog
	err := r.db.WithContext(ctx).
		Where("poliza_id = ?", polizaID).
		Order("changed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

func (r *auditRepository) GetAgenteAudit(ctx context.Context, agenteID int, limit, offset int) ([]models.AgenteAuditLog, error) {
	var logs []models.AgenteAuditLog
	err := r.db.WithContext(ctx).
		Where("agente_id = ?", agenteID).
		Order("changed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

func (r *auditRepository) GetAllPolizaAudit(ctx context.Context, limit, offset int) ([]PolizaAuditEntry, error) {
	var entries []PolizaAuditEntry
	err := r.db.WithContext(ctx).Raw(`
		SELECT pal.field_name, pal.old_value, pal.new_value,
			pal.changed_at, pal.source,
			p.numpoliza,
			COALESCE(a.email, '') as agente_email
		FROM polizas_audit_log pal
		JOIN polizas p ON p.poliza_id = pal.poliza_id
		LEFT JOIN agentes a ON a.agente_id = pal.changed_by
		ORDER BY pal.changed_at DESC
		LIMIT ? OFFSET ?`, limit, offset).Scan(&entries).Error
	return entries, err
}

func (r *auditRepository) GetAllAgenteAudit(ctx context.Context, limit, offset int) ([]AgenteAuditEntry, error) {
	var entries []AgenteAuditEntry
	err := r.db.WithContext(ctx).Raw(`
		SELECT aal.field_name, aal.old_value, aal.new_value,
			aal.changed_at, aal.source,
			a.email as agente_email
		FROM agentes_audit_log aal
		JOIN agentes a ON a.agente_id = aal.agente_id
		ORDER BY aal.changed_at DESC
		LIMIT ? OFFSET ?`, limit, offset).Scan(&entries).Error
	return entries, err
}
