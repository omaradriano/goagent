package models

import "time"

type PolizaFlexiblePago struct {
	PagoID     int        `gorm:"primaryKey;column:pago_id" json:"-"`
	PolizaID   *int64     `gorm:"column:poliza_id;index" json:"-"`
	FechaPago  time.Time  `gorm:"column:fecha_pago;not null" json:"fecha_pago"`
	ImporteUdi float64    `gorm:"column:importe_udi;type:numeric(14,4);not null" json:"importe_udi"`
	CreatedAt  *time.Time `gorm:"column:created_at;default:now()" json:"created_at"`

	Poliza *Poliza `gorm:"foreignKey:PolizaID" json:"poliza,omitempty"`
}

func (PolizaFlexiblePago) TableName() string { return "polizas_flexible_pagos" }
