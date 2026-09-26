package repository

import (
	"context"
	"time"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

// PersonaAdicionalInput son los datos editables de una persona adicional.
// Dia y Mes ya vienen validados (ver handlers.parsePersonaAdicional).
type PersonaAdicionalInput struct {
	NombreCompleto string
	Dia            int
	Mes            int
	Parentesco     string
}

// PersonaAdicionalEntry es una persona adicional tal como la consume la web:
// el cumpleanos como dia y mes (el ano guardado es fijo y no significa nada).
type PersonaAdicionalEntry struct {
	PersonaID      int    `gorm:"column:persona_id" json:"persona_id"`
	NombreCompleto string `gorm:"column:nombre_completo" json:"nombre_completo"`
	Parentesco     string `gorm:"column:parentesco" json:"parentesco"`
	Dia            int    `gorm:"column:dia" json:"dia"`
	Mes            int    `gorm:"column:mes" json:"mes"`
}

type PersonaAdicionalRepository interface {
	ListByPoliza(ctx context.Context, polizaID int64) ([]PersonaAdicionalEntry, error)
	Create(ctx context.Context, polizaID int64, agenteID int, in PersonaAdicionalInput) (*PersonaAdicionalEntry, error)
	Update(ctx context.Context, polizaID int64, personaID int, in PersonaAdicionalInput) (*PersonaAdicionalEntry, error)
	Delete(ctx context.Context, polizaID int64, personaID int) (bool, error)
}

type personaAdicionalRepository struct {
	db *gorm.DB
}

func NewPersonaAdicionalRepository(db *gorm.DB) PersonaAdicionalRepository {
	return &personaAdicionalRepository{db: db}
}

// PersonaAdicionalAno es el ano fijo con el que se guarda el cumpleanos
// (bisiesto, para aceptar el 29 de febrero).
const PersonaAdicionalAno = 2000

func birthdayFromInput(in PersonaAdicionalInput) time.Time {
	return time.Date(PersonaAdicionalAno, time.Month(in.Mes), in.Dia, 0, 0, 0, 0, time.UTC)
}

const personaAdicionalSelect = `
	SELECT persona_id, nombre_completo, parentesco,
	    EXTRACT(DAY FROM birthday)::int AS dia,
	    EXTRACT(MONTH FROM birthday)::int AS mes
	FROM polizas_personas_adicionales`

func (r *personaAdicionalRepository) find(ctx context.Context, personaID int) (*PersonaAdicionalEntry, error) {
	var entry PersonaAdicionalEntry
	err := r.db.WithContext(ctx).
		Raw(personaAdicionalSelect+" WHERE persona_id = ?", personaID).
		Scan(&entry).Error
	return &entry, err
}

// ListByPoliza devuelve las personas adicionales de la poliza ordenadas por
// cumpleanos (mes y dia).
func (r *personaAdicionalRepository) ListByPoliza(ctx context.Context, polizaID int64) ([]PersonaAdicionalEntry, error) {
	entries := []PersonaAdicionalEntry{}
	err := r.db.WithContext(ctx).
		Raw(personaAdicionalSelect+" WHERE poliza_id = ? ORDER BY birthday, persona_id", polizaID).
		Scan(&entries).Error
	return entries, err
}

func (r *personaAdicionalRepository) Create(ctx context.Context, polizaID int64, agenteID int, in PersonaAdicionalInput) (*PersonaAdicionalEntry, error) {
	persona := models.PolizaPersonaAdicional{
		PolizaID:       polizaID,
		AgenteID:       agenteID,
		NombreCompleto: in.NombreCompleto,
		Birthday:       birthdayFromInput(in),
		Parentesco:     in.Parentesco,
	}
	if err := r.db.WithContext(ctx).Create(&persona).Error; err != nil {
		return nil, err
	}
	return r.find(ctx, persona.PersonaID)
}

// Update edita la persona. El filtro por polizaID evita editar una persona de
// otra poliza con un id ajeno. Devuelve nil (sin error) si no existia.
func (r *personaAdicionalRepository) Update(ctx context.Context, polizaID int64, personaID int, in PersonaAdicionalInput) (*PersonaAdicionalEntry, error) {
	res := r.db.WithContext(ctx).
		Model(&models.PolizaPersonaAdicional{}).
		Where("persona_id = ? AND poliza_id = ?", personaID, polizaID).
		Updates(map[string]any{
			"nombre_completo": in.NombreCompleto,
			"birthday":        birthdayFromInput(in),
			"parentesco":      in.Parentesco,
			"updated_at":      time.Now(),
		})
	if res.Error != nil || res.RowsAffected == 0 {
		return nil, res.Error
	}
	return r.find(ctx, personaID)
}

// Delete borra la persona (borrado fisico: no hay historial que conservar).
// Devuelve false si no existia en esa poliza.
func (r *personaAdicionalRepository) Delete(ctx context.Context, polizaID int64, personaID int) (bool, error) {
	res := r.db.WithContext(ctx).
		Where("persona_id = ? AND poliza_id = ?", personaID, polizaID).
		Delete(&models.PolizaPersonaAdicional{})
	return res.RowsAffected > 0, res.Error
}
