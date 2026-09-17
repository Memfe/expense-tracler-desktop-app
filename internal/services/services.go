package services

import (
	"database/sql"

	"expense_tracker/internal/db/sqlc"
)

// Services is the container every dependency goes through. The Wails bindings
// only ever talk to this struct instead of building services themselves.
type Services struct {
	Categories     *CategoryService
	Transactions   *TransactionService
	CategoriesExt  *CategoryExtra
	Dashboard      *DashboardService
	Settings       *SettingsService
	System         *SystemService
	Report         *ReportService
}

func NewServices(q *sqlc.Queries, db *sql.DB, dbPath string) *Services {
	categories := NewCategoryService(q)
	transactions := NewTransactionService(q)

	var (
		settingsService *SettingsService
		systemService   *SystemService
		categoriesExt   *CategoryExtra
		reportService   *ReportService
	)
	if db != nil {
		settingsService = NewSettingsService(db, dbPath)
		categoriesExt = NewCategoryExtra(db, q)
		systemService = NewSystemService(db, dbPath, q, categories, transactions, settingsService)
		reportService = NewReportService(db, q)
	}

	return &Services{
		Categories:     categories,
		Transactions:   transactions,
		CategoriesExt:  categoriesExt,
		Dashboard:      NewDashboardService(transactions),
		Settings:       settingsService,
		System:         systemService,
		Report:         reportService,
	}
}
