package models

import "time"

// SyncRun es una sincronizacion de la extension (ver migracion 19).
type SyncRun struct {
	SyncID           int        `gorm:"primaryKey;column:sync_id" json:"sync_id"`
	AgenteID         int        `gorm:"column:agente_id;not null" json:"-"`
	Tipo             string     `gorm:"column:tipo;not null" json:"tipo"`
	Estado           string     `gorm:"column:estado;not null;default:en_curso" json:"estado"`
	StartedAt        time.Time  `gorm:"column:started_at;default:now()" json:"started_at"`
	FinishedAt       *time.Time `gorm:"column:finished_at" json:"finished_at"`
	PorVencerAntes   *int       `gorm:"column:por_vencer_antes" json:"por_vencer_antes"`
	PorVencerDespues *int       `gorm:"column:por_vencer_despues" json:"por_vencer_despues"`
}

func (SyncRun) TableName() string { return "sync_runs" }

// Tipos de sync_run.
const (
	SyncTipoParcial    = "parcial"
	SyncTipoCompleta   = "completa"
	SyncTipoIndividual = "individual"
)

// Estados de sync_run.
const (
	SyncEstadoEnCurso      = "en_curso"
	SyncEstadoCompletada   = "completada"
	SyncEstadoInterrumpida = "interrumpida"
	SyncEstadoDetenida     = "detenida"
)

// SyncEvento es un cambio detectado durante una sincronizacion.
type SyncEvento struct {
	EventoID      int       `gorm:"primaryKey;column:evento_id" json:"-"`
	SyncID        *int      `gorm:"column:sync_id" json:"-"`
	AgenteID      int       `gorm:"column:agente_id;not null" json:"-"`
	PolizaID      int64     `gorm:"column:poliza_id;not null" json:"-"`
	Tipo          string    `gorm:"column:tipo;not null" json:"tipo"`
	ValorAnterior *string   `gorm:"column:valor_anterior" json:"valor_anterior"`
	ValorNuevo    *string   `gorm:"column:valor_nuevo" json:"valor_nuevo"`
	CreatedAt     time.Time `gorm:"column:created_at;default:now()" json:"created_at"`
}

func (SyncEvento) TableName() string { return "sync_eventos" }

// Tipos de sync_evento.
const (
	SyncEventoPago    = "pago"
	SyncEventoEstatus = "estatus"
	SyncEventoAlta    = "alta"
)
