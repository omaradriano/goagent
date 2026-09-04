package repository

import (
	"context"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
)

type AseguradoRepository interface {
	FindByPolizaID(ctx context.Context, polizaID int) ([]models.Asegurado, error)
	Create(ctx context.Context, asegurado *models.Asegurado) error
	BulkCreate(ctx context.Context, asegurados []models.Asegurado) error
	ReplaceByPolizaID(ctx context.Context, polizaID int, asegurados []models.Asegurado) error
}

type aseguradoRepository struct {
	db *gorm.DB
}

func NewAseguradoRepository(db *gorm.DB) AseguradoRepository {
	return &aseguradoRepository{db: db}
}

func (r *aseguradoRepository) FindByPolizaID(ctx context.Context, polizaID int) ([]models.Asegurado, error) {
	var asegurados []models.Asegurado
	err := r.db.WithContext(ctx).Where("poliza_id = ?", polizaID).Find(&asegurados).Error
	return asegurados, err
}

func (r *aseguradoRepository) Create(ctx context.Context, asegurado *models.Asegurado) error {
	return r.db.WithContext(ctx).Create(asegurado).Error
}

func (r *aseguradoRepository) BulkCreate(ctx context.Context, asegurados []models.Asegurado) error {
	if len(asegurados) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&asegurados).Error
}

// ReplaceByPolizaID reemplaza por completo los asegurados de una poliza
// (delete+insert, mismo patron que PolizaFlexibleRepo.ReplacePagos). Solo se
// invoca desde el resync completo cuando el payload scrapeado trae al menos
// un asegurado - nunca se llama con una lista vacia, para no borrar fechas
// de nacimiento existentes por una lectura DOM parcial/fallida.
func (r *aseguradoRepository) ReplaceByPolizaID(ctx context.Context, polizaID int, asegurados []models.Asegurado) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("poliza_id = ?", polizaID).Delete(&models.Asegurado{}).Error; err != nil {
			return err
		}
		if len(asegurados) == 0 {
			return nil
		}
		return tx.Create(&asegurados).Error
	})
}
