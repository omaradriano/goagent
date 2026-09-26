package models

import "time"

// PolizaPersonaAdicional es un familiar de los asegurados que no esta en el
// seguro; solo se registra para el calendario de cumpleanos. Birthday guarda
// dia y mes con el ano fijo 2000.
type PolizaPersonaAdicional struct {
	PersonaID      int       `gorm:"primaryKey;column:persona_id" json:"persona_id"`
	PolizaID       int64     `gorm:"column:poliza_id;not null" json:"-"`
	AgenteID       int       `gorm:"column:agente_id;not null" json:"-"`
	NombreCompleto string    `gorm:"column:nombre_completo;not null" json:"nombre_completo"`
	Birthday       time.Time `gorm:"column:birthday;type:date;not null" json:"-"`
	Parentesco     string    `gorm:"column:parentesco;not null" json:"parentesco"`
	CreatedAt      time.Time `gorm:"column:created_at;default:now();not null" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at;default:now();not null" json:"updated_at"`
}

func (PolizaPersonaAdicional) TableName() string { return "polizas_personas_adicionales" }
