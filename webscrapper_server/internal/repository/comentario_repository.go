package repository

import (
	"context"
	"time"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

// ComentarioEntry es un comentario de la bitacora con el correo de su autor.
type ComentarioEntry struct {
	ComentarioID int       `gorm:"column:comentario_id" json:"comentario_id"`
	Contenido    string    `gorm:"column:contenido" json:"contenido"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	AutorEmail   string    `gorm:"column:autor_email" json:"autor_email"`
}

type ComentarioRepository interface {
	ListByPoliza(ctx context.Context, polizaID int64) ([]ComentarioEntry, error)
	Create(ctx context.Context, polizaID int64, agenteID int, contenido string) (*ComentarioEntry, error)
	SoftDelete(ctx context.Context, polizaID int64, comentarioID int) (bool, error)
}

type comentarioRepository struct {
	db *gorm.DB
}

func NewComentarioRepository(db *gorm.DB) ComentarioRepository {
	return &comentarioRepository{db: db}
}

func (r *comentarioRepository) ListByPoliza(ctx context.Context, polizaID int64) ([]ComentarioEntry, error) {
	entries := []ComentarioEntry{}
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.comentario_id, c.contenido, c.created_at, COALESCE(a.email, '') AS autor_email
		FROM polizas_comentarios c
		LEFT JOIN agentes a ON a.agente_id = c.agente_id
		WHERE c.poliza_id = ? AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC, c.comentario_id DESC`, polizaID).
		Scan(&entries).Error
	return entries, err
}

func (r *comentarioRepository) Create(ctx context.Context, polizaID int64, agenteID int, contenido string) (*ComentarioEntry, error) {
	comentario := models.PolizaComentario{
		PolizaID:  polizaID,
		AgenteID:  agenteID,
		Contenido: contenido,
	}
	if err := r.db.WithContext(ctx).Create(&comentario).Error; err != nil {
		return nil, err
	}

	var entry ComentarioEntry
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.comentario_id, c.contenido, c.created_at, COALESCE(a.email, '') AS autor_email
		FROM polizas_comentarios c
		LEFT JOIN agentes a ON a.agente_id = c.agente_id
		WHERE c.comentario_id = ?`, comentario.ComentarioID).
		Scan(&entry).Error
	return &entry, err
}

// SoftDelete marca el comentario como borrado. El filtro por polizaID evita
// borrar comentarios de otra poliza con un id ajeno. Devuelve false si no
// existia (o ya estaba borrado).
func (r *comentarioRepository) SoftDelete(ctx context.Context, polizaID int64, comentarioID int) (bool, error) {
	res := r.db.WithContext(ctx).
		Model(&models.PolizaComentario{}).
		Where("comentario_id = ? AND poliza_id = ? AND deleted_at IS NULL", comentarioID, polizaID).
		Update("deleted_at", time.Now())
	return res.RowsAffected > 0, res.Error
}
