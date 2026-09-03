package models

import "time"

type PolizaFlexibleAnualidad struct {
	AnualidadID     int        `gorm:"primaryKey;column:anualidad_id" json:"-"`
	PolizaID        *int64     `gorm:"column:poliza_id;uniqueIndex" json:"-"`
	PrimaBasicaUdis float64    `gorm:"column:prima_basica_udis;type:numeric(14,4);not null" json:"prima_basica_udis"`
	AnualidadDesde  time.Time  `gorm:"column:anualidad_desde;not null" json:"anualidad_desde"`
	AnualidadHasta  time.Time  `gorm:"column:anualidad_hasta;not null" json:"anualidad_hasta"`
	LastSynced      *time.Time `gorm:"column:last_synced;default:now()" json:"last_synced"`

	Poliza *Poliza `gorm:"foreignKey:PolizaID" json:"poliza,omitempty"`
}

func (PolizaFlexibleAnualidad) TableName() string { return "polizas_flexible_anualidad" }
