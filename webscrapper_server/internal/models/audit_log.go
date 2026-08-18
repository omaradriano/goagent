package models

import "time"

type PolizaAuditLog struct {
	AuditID   int        `gorm:"primaryKey;column:audit_id" json:"-"`
	PolizaID  int        `gorm:"column:poliza_id;not null" json:"-"`
	FieldName string     `gorm:"column:field_name;size:64;not null" json:"field_name"`
	OldValue  *string    `gorm:"column:old_value" json:"old_value"`
	NewValue  *string    `gorm:"column:new_value" json:"new_value"`
	ChangedBy *int       `gorm:"column:changed_by" json:"-"`
	ChangedAt time.Time  `gorm:"column:changed_at;default:now();not null" json:"changed_at"`
	Source    string     `gorm:"column:source;size:32;default:'api';not null" json:"source"`
}

func (PolizaAuditLog) TableName() string { return "polizas_audit_log" }

type AgenteAuditLog struct {
	AuditID   int        `gorm:"primaryKey;column:audit_id" json:"-"`
	AgenteID  int        `gorm:"column:agente_id;not null" json:"-"`
	FieldName string     `gorm:"column:field_name;size:64;not null" json:"field_name"`
	OldValue  *string    `gorm:"column:old_value" json:"old_value"`
	NewValue  *string    `gorm:"column:new_value" json:"new_value"`
	ChangedBy *int       `gorm:"column:changed_by" json:"-"`
	ChangedAt time.Time  `gorm:"column:changed_at;default:now();not null" json:"changed_at"`
	Source    string     `gorm:"column:source;size:32;default:'api';not null" json:"source"`
}

func (AgenteAuditLog) TableName() string { return "agentes_audit_log" }
