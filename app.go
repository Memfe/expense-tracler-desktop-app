package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"expense_tracker/internal/models"
	"expense_tracker/internal/services"
)

// App exposes the backend to the frontend. Every method only delegates to the
// services container, so no business logic lives in this file.
type App struct {
	ctx      context.Context
	services *services.Services
	db       *sql.DB
}

func NewApp(s *services.Services, db *sql.DB) *App {
	return &App{
		services: s,
		db:       db,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) ctxOrBackground() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}

// --- Dashboard --------------------------------------------------------------

// GetDashboardData returns the totals, category breakdown and recent activity
// for the supplied date range (dates in "YYYY-MM-DD" format).
func (a *App) GetDashboardData(startDateStr, endDateStr string) (models.DashboardData, error) {
	start, end, err := parseDateRange(startDateStr, endDateStr)
	if err != nil {
		return models.DashboardData{}, err
	}

	return a.services.Dashboard.GetDashboardData(a.ctxOrBackground(), start, end)
}

// --- Transactions -----------------------------------------------------------

func (a *App) GetAllTransactions(page, pageSize int64, query string) (*models.PaginatedTransactions, error) {
	effPage, effSize := effectivePaging(page, pageSize)
	txs, total, err := a.services.Transactions.GetAllTransactions(a.ctxOrBackground(), page, pageSize, query)
	if err != nil {
		return nil, err
	}
	return &models.PaginatedTransactions{
		Transactions: txs,
		Total:        total,
		Page:         effPage,
		PageSize:     effSize,
	}, nil
}

func (a *App) GetTransactionsByDateRange(startDateStr, endDateStr string, page, pageSize int64) (*models.PaginatedTransactions, error) {
	start, end, err := parseDateRange(startDateStr, endDateStr)
	if err != nil {
		return nil, err
	}

	effPage, effSize := effectivePaging(page, pageSize)
	txs, total, err := a.services.Transactions.GetTransactionByDateRange(a.ctxOrBackground(), start, end, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &models.PaginatedTransactions{
		Transactions: txs,
		Total:        total,
		Page:         effPage,
		PageSize:     effSize,
	}, nil
}

func (a *App) GetTransactionsByCategoryType(categoryType string, page, pageSize int64) (*models.PaginatedTransactions, error) {
	effPage, effSize := effectivePaging(page, pageSize)
	txs, total, err := a.services.Transactions.GetTransactionsByCategoryType(a.ctxOrBackground(), categoryType, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &models.PaginatedTransactions{
		Transactions: txs,
		Total:        total,
		Page:         effPage,
		PageSize:     effSize,
	}, nil
}

func (a *App) GetTransactionsByCategoryID(categoryID, page, pageSize int64) (*models.PaginatedTransactions, error) {
	effPage, effSize := effectivePaging(page, pageSize)
	txs, total, err := a.services.Transactions.GetTransactionsByCategoryID(a.ctxOrBackground(), categoryID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &models.PaginatedTransactions{
		Transactions: txs,
		Total:        total,
		Page:         effPage,
		PageSize:     effSize,
	}, nil
}

func (a *App) GetTransactionByID(id int64) (models.TransactionResponse, error) {
	return a.services.Transactions.GetTransactionByID(a.ctxOrBackground(), id)
}

func (a *App) CreateTransaction(req models.CreateTransactionRequest) error {
	return a.services.Transactions.CreateTransaction(a.ctxOrBackground(), req)
}

func (a *App) EditTransaction(req models.EditTransactionRequest) error {
	return a.services.Transactions.EditTransaction(a.ctxOrBackground(), req)
}

// --- Categories -------------------------------------------------------------

func (a *App) GetAllCategories() ([]models.CategoryResponse, error) {
	return a.services.Categories.GetAllCategories(a.ctxOrBackground())
}

func (a *App) CreateCategory(req models.CreateCategoryRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Type = strings.ToLower(strings.TrimSpace(req.Type))
	if req.Type != "income" && req.Type != "expense" {
		return fmt.Errorf("invalid category type: %q (must be income or expense)", req.Type)
	}
	if err := a.services.Categories.CreateCategory(a.ctxOrBackground(), req); err != nil {
		return friendlyCategoryError(req.Name, err)
	}
	return nil
}

func (a *App) EditCategory(req models.EditCategoryRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Type = strings.ToLower(strings.TrimSpace(req.Type))
	if req.Type != "income" && req.Type != "expense" {
		return fmt.Errorf("invalid category type: %q (must be income or expense)", req.Type)
	}
	if err := a.services.Categories.EditCategory(a.ctxOrBackground(), req); err != nil {
		return friendlyCategoryError(req.Name, err)
	}
	return nil
}

// --- Data & Backups -----------------------------------------------------------

// wailsContext returns the real Wails startup context; native dialogs only
// work with it, so callers must handle the nil case before startup().
func (a *App) wailsContext() context.Context {
	return a.ctx
}

// PickBackupDestination shows a native save dialog and returns the chosen path
// ("" when cancelled). The file itself is written by BackupDatabase.
func (a *App) PickBackupDestination() (string, error) {
	ctx := a.wailsContext()
	if ctx == nil {
		return "", errors.New("the app is still starting up, try again")
	}
	return wailsruntime.SaveFileDialog(ctx, wailsruntime.SaveDialogOptions{
		Title:           "Save database backup",
		DefaultFilename: fmt.Sprintf("expense-tracker-backup-%s.db", time.Now().Format("20060102-150405")),
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Database backup (*.db)", Pattern: "*.db"},
		},
	})
}

// BackupDatabase writes a consistent snapshot of the whole database to destPath.
func (a *App) BackupDatabase(destPath string) error {
	if a.services.System == nil {
		return errors.New("system service not initialized")
	}
	return a.services.System.BackupDatabase(a.ctxOrBackground(), destPath)
}

// PickBackupSource shows a native open dialog and returns the chosen backup
// path ("" when cancelled). The restore itself is done by RestoreBackup.
func (a *App) PickBackupSource() (string, error) {
	ctx := a.wailsContext()
	if ctx == nil {
		return "", errors.New("the app is still starting up, try again")
	}
	return wailsruntime.OpenFileDialog(ctx, wailsruntime.OpenDialogOptions{
		Title: "Select a database backup to restore",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Database backup (*.db)", Pattern: "*.db"},
		},
	})
}

// RestoreBackup replaces all current data with the contents of backupPath.
func (a *App) RestoreBackup(backupPath string) error {
	if a.services.System == nil {
		return errors.New("system service not initialized")
	}
	return a.services.System.RestoreBackup(a.ctxOrBackground(), backupPath)
}

// ResetAllData erases every transaction, category and setting. The schema and
// the applied migrations stay, so the app keeps working right afterwards.
func (a *App) ResetAllData() error {
	if a.services.System == nil {
		return errors.New("system service not initialized")
	}
	return a.services.System.ResetAllData(a.ctxOrBackground())
}

// DeleteCategory removes a category only when no transaction still uses it.
func (a *App) DeleteCategory(id int64) error {
	if a.services.CategoriesExt == nil {
		return errors.New("category service not initialized")
	}
	return a.services.CategoriesExt.DeleteCategory(a.ctxOrBackground(), id)
}

// GetCategoryUsageCount reports how many transactions use a category.
func (a *App) GetCategoryUsageCount(id int64) (int64, error) {
	if a.services.CategoriesExt == nil {
		return 0, errors.New("category service not initialized")
	}
	return a.services.CategoriesExt.TransactionCount(a.ctxOrBackground(), id)
}

// DeleteTransaction removes a transaction by ID. Returns an error if the
// transaction does not exist.
func (a *App) DeleteTransaction(id int64) error {
	if a.services.TransactionsExt == nil {
		return errors.New("transaction service not initialized")
	}
	return a.services.TransactionsExt.DeleteTransaction(a.ctxOrBackground(), id)
}

// --- Settings ---------------------------------------------------------------

func (a *App) GetAppSettings() (models.AppSettings, error) {
	settings, err := a.settings()
	if err != nil {
		return models.AppSettings{}, err
	}
	return settings.GetAppSettings(a.ctxOrBackground())
}

func (a *App) GetAllSettings() (map[string]string, error) {
	settings, err := a.settings()
	if err != nil {
		return nil, err
	}
	return settings.GetAllSettings(a.ctxOrBackground())
}

func (a *App) UpdateSetting(key, value string) error {
	settings, err := a.settings()
	if err != nil {
		return err
	}
	return settings.UpdateSetting(a.ctxOrBackground(), key, value)
}

// ResetSettings deletes every stored preference so the defaults apply again.
func (a *App) ResetSettings() error {
	settings, err := a.settings()
	if err != nil {
		return err
	}
	return settings.ResetSettings(a.ctxOrBackground())
}

// GetSystemInfo describes the running environment for the settings page.
func (a *App) GetSystemInfo() (models.SystemInfo, error) {
	if a.services.System == nil {
		return models.SystemInfo{}, errors.New("system service not initialized")
	}
	return a.services.System.GetSystemInfo(a.ctxOrBackground())
}

// ExportTransactionsCSV returns every transaction as CSV for backup/analysis.
func (a *App) ExportTransactionsCSV() (string, error) {
	if a.services.System == nil {
		return "", errors.New("system service not initialized")
	}
	return a.services.System.ExportTransactionsCSV(a.ctxOrBackground())
}

// --- Helpers ----------------------------------------------------------------

func (a *App) settings() (*services.SettingsService, error) {
	if a.services.Settings == nil {
		return nil, errors.New("settings service not initialized")
	}
	return a.services.Settings, nil
}

func effectivePaging(page, pageSize int64) (int64, int64) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func friendlyCategoryError(name string, err error) error {
	if strings.Contains(err.Error(), "UNIQUE") {
		if name == "" {
			return errors.New("a category with that name already exists")
		}
		return fmt.Errorf("a category called %q already exists", name)
	}
	return err
}

func parseDateRange(startDateStr, endDateStr string) (time.Time, time.Time, error) {
	start, err := parseDate(startDateStr)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid start date: %w", err)
	}

	end, err := parseDate(endDateStr)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid end date: %w", err)
	}

	return start, end, nil
}

func parseDate(dateStr string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", dateStr); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, dateStr); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02 15:04:05", dateStr); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid date format: %s", dateStr)
}
