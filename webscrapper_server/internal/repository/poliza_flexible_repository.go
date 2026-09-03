package repository

import (
	"context"

	"github.com/omaradriano/cobranzawebscrapper_server/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PolizaFlexibleRepository interface {
	UpsertAnualidad(ctx context.Context, anualidad *models.PolizaFlexibleAnualidad) error
	ReplacePagos(ctx context.Context, polizaID int64, pagos []models.PolizaFlexiblePago) error
	GetByPolizaID(ctx context.Context, polizaID int64) (*models.PolizaFlexibleAnualidad, []models.PolizaFlexiblePago, error)
	GetByPolizaIDs(ctx context.Context, polizaIDs []int64) (map[int64]*models.PolizaFlexibleAnualidad, map[int64][]models.PolizaFlexiblePago, error)
}

type polizaFlexibleRepository struct {
	db *gorm.DB
}

func NewPolizaFlexibleRepository(db *gorm.DB) PolizaFlexibleRepository {
	return &polizaFlexibleRepository{db: db}
}

func (r *polizaFlexibleRepository) UpsertAnualidad(ctx context.Context, anualidad *models.PolizaFlexibleAnualidad) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "poliza_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"prima_basica_udis", "anualidad_desde", "anualidad_hasta", "last_synced"}),
		}).
		Create(anualidad).Error
}

func (r *polizaFlexibleRepository) ReplacePagos(ctx context.Context, polizaID int64, pagos []models.PolizaFlexiblePago) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("poliza_id = ?", polizaID).Delete(&models.PolizaFlexiblePago{}).Error; err != nil {
			return err
		}
		if len(pagos) == 0 {
			return nil
		}
		return tx.Create(&pagos).Error
	})
}

func (r *polizaFlexibleRepository) GetByPolizaID(ctx context.Context, polizaID int64) (*models.PolizaFlexibleAnualidad, []models.PolizaFlexiblePago, error) {
	var anualidad models.PolizaFlexibleAnualidad
	err := r.db.WithContext(ctx).Where("poliza_id = ?", polizaID).First(&anualidad).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	var pagos []models.PolizaFlexiblePago
	if err := r.db.WithContext(ctx).Where("poliza_id = ?", polizaID).Order("fecha_pago ASC").Find(&pagos).Error; err != nil {
		return nil, nil, err
	}

	return &anualidad, pagos, nil
}

func (r *polizaFlexibleRepository) GetByPolizaIDs(ctx context.Context, polizaIDs []int64) (map[int64]*models.PolizaFlexibleAnualidad, map[int64][]models.PolizaFlexiblePago, error) {
	anualidades := make(map[int64]*models.PolizaFlexibleAnualidad)
	pagosMap := make(map[int64][]models.PolizaFlexiblePago)

	if len(polizaIDs) == 0 {
		return anualidades, pagosMap, nil
	}

	var anualidadRows []models.PolizaFlexibleAnualidad
	if err := r.db.WithContext(ctx).Where("poliza_id IN ?", polizaIDs).Find(&anualidadRows).Error; err != nil {
		return nil, nil, err
	}
	for i := range anualidadRows {
		if anualidadRows[i].PolizaID != nil {
			anualidades[*anualidadRows[i].PolizaID] = &anualidadRows[i]
		}
	}

	var pagoRows []models.PolizaFlexiblePago
	if err := r.db.WithContext(ctx).Where("poliza_id IN ?", polizaIDs).Order("fecha_pago ASC").Find(&pagoRows).Error; err != nil {
		return nil, nil, err
	}
	for _, pago := range pagoRows {
		if pago.PolizaID != nil {
			pagosMap[*pago.PolizaID] = append(pagosMap[*pago.PolizaID], pago)
		}
	}

	return anualidades, pagosMap, nil
}
