package models

import "time"

type PolizaComentario struct {
	ComentarioID int        `gorm:"primaryKey;column:comentario_id" json:"comentario_id"`
	PolizaID     int64      `gorm:"column:poliza_id;not null" json:"-"`
	AgenteID     int        `gorm:"column:agente_id;not null" json:"-"`
	Contenido    string     `gorm:"column:contenido;not null" json:"contenido"`
	CreatedAt    time.Time  `gorm:"column:created_at;default:now();not null" json:"created_at"`
	DeletedAt    *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (PolizaComentario) TableName() string { return "polizas_comentarios" }
