package handlers

import (
	"github.com/omaradriano/cobranzawebscrapper_server/internal/repository"
	"gorm.io/gorm"
)

type Deps struct {
	DB                 *gorm.DB
	AgenteRepo         repository.AgenteRepository
	PolizaRepo         repository.PolizaRepository
	PolizaFlexibleRepo repository.PolizaFlexibleRepository
	AseguradoRepo      repository.AseguradoRepository
	AuditRepo          repository.AuditRepository
}

var deps *Deps

func InitDeps(gormDB *gorm.DB) {
	deps = &Deps{
		DB:                 gormDB,
		AgenteRepo:         repository.NewAgenteRepository(gormDB),
		PolizaRepo:         repository.NewPolizaRepository(gormDB),
		PolizaFlexibleRepo: repository.NewPolizaFlexibleRepository(gormDB),
		AseguradoRepo:      repository.NewAseguradoRepository(gormDB),
		AuditRepo:          repository.NewAuditRepository(gormDB),
	}
}
