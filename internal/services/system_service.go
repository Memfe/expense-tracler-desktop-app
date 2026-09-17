package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strings"

	appdb "expense_tracker/internal/db"
	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/models"
)

const (
	sqliteDriverPath  = "modernc.org/sqlite"
	sqliteEngineLabel = "modernc.org/sqlite (pure Go)"
	wailsRuntimeLabel = "Wails v2 (desktop)"
)

// SystemService reports read-only environment details for the settings page. It
// reuses the other services so it never duplicates their queries.
type SystemService struct {
	db           *sql.DB
	dbPath       string
	queries      *sqlc.Queries
	categories   *CategoryService
	transactions *TransactionService
	settings     *SettingsService
}

func NewSystemService(
	db *sql.DB,
	dbPath string,
	queries *sqlc.Queries,
	categories *CategoryService,
	transactions *TransactionService,
	settings *SettingsService,
) *SystemService {
	if dbPath == "" {
		dbPath = DefaultDatabasePath
	}
	return &SystemService{
		db:           db,
		dbPath:       dbPath,
		queries:      queries,
		categories:   categories,
		transactions: transactions,
		settings:     settings,
	}
}

// GetSystemInfo gathers the database location, applied migrations and record
// counts shown on the settings page.
func (s *SystemService) GetSystemInfo(ctx context.Context) (models.SystemInfo, error) {
	info := models.SystemInfo{
		DatabasePath: s.dbPath,
		Engine:       engineLabel(),
		Runtime:      runtimeLabel(),
	}

	if s.db != nil {
		migrations, err := appdb.AppliedMigrations(s.db)
		if err != nil {
			return models.SystemInfo{}, fmt.Errorf("failed to read applied migrations: %w", err)
		}
		info.Migrations = migrations
	}

	if s.categories != nil {
		categories, err := s.categories.GetAllCategories(ctx)
		if err != nil {
			return models.SystemInfo{}, fmt.Errorf("failed to count categories: %w", err)
		}
		info.CategoriesCount = int64(len(categories))
	}

	if s.transactions != nil {
		count, err := s.countTransactions(ctx)
		if err != nil {
			return models.SystemInfo{}, err
		}
		info.TransactionsCount = count
	}

	if s.settings != nil {
		settings, err := s.settings.GetAllSettings(ctx)
		if err != nil {
			return models.SystemInfo{}, fmt.Errorf("failed to count settings: %w", err)
		}
		info.SettingsCount = int64(len(settings))
	}

	return info, nil
}

// countTransactions returns how many transactions are stored.
func (s *SystemService) countTransactions(ctx context.Context) (int64, error) {
	if s.queries == nil {
		return 0, errors.New("queries are not initialised")
	}

	total, err := s.queries.CountTransactions(ctx, "")
	if err != nil {
		return 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	return total, nil
}

// ExportTransactionsCSV dumps every transaction (newest first) as CSV so the
// user can back up or analyse their data outside the app.
func (s *SystemService) ExportTransactionsCSV(ctx context.Context) (string, error) {
	if s.db == nil {
		return "", errors.New("database is not initialised")
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT t.id, t.transaction_date, c.name, c.type, t.description, t.amount
FROM transactions t JOIN categories c ON t.category_id = c.id
ORDER BY t.transaction_date DESC, t.id DESC;`)
	if err != nil {
		return "", fmt.Errorf("failed to read transactions: %w", err)
	}
	defer rows.Close()

	var b strings.Builder
	b.WriteString("id,date,category,type,description,amount_cedis\n")
	for rows.Next() {
		var id int64
		var date, catName, catType, desc string
		var amountPesewas int64
		if err := rows.Scan(&id, &date, &catName, &catType, &desc, &amountPesewas); err != nil {
			return "", fmt.Errorf("failed to scan transaction: %w", err)
		}
		fmt.Fprintf(&b, "%d,%s,%s,%s,%s,%.2f\n", id, csvCell(date), csvCell(catName),
			csvCell(catType), csvCell(desc), float64(amountPesewas)/100)
	}
	if err := rows.Err(); err != nil {
		return "", fmt.Errorf("error reading transactions: %w", err)
	}
	return b.String(), nil
}

func csvCell(s string) string {
	if strings.ContainsAny(s, ",\"\n") {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}
	return s
}

// engineLabel reports the SQLite driver the binary was compiled against.
func engineLabel() string {
	if version := dependencyVersion(sqliteDriverPath); version != "" {
		return fmt.Sprintf("%s (%s)", sqliteDriverPath, version)
	}
	return sqliteEngineLabel
}

// runtimeLabel reports the Wails and Go versions the binary was built with.
func runtimeLabel() string {
	goVersion := strings.TrimPrefix(runtime.Version(), "go")

	if wailsVersion := dependencyVersion("github.com/wailsapp/wails/v2"); wailsVersion != "" {
		return fmt.Sprintf("Wails %s · Go %s", wailsVersion, goVersion)
	}
	return fmt.Sprintf("%s · Go %s", wailsRuntimeLabel, goVersion)
}

// dependencyVersion reads the module version the binary was compiled against.
func dependencyVersion(path string) string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return ""
	}
	for _, dep := range info.Deps {
		if dep.Path == path {
			return dep.Version
		}
	}
	return ""
}

// --- Data & Backups -----------------------------------------------------------

// sqliteFileHeader is the magic every SQLite database file starts with.
const sqliteFileHeader = "SQLite format 3\x00"

// BackupDatabase writes a consistent single-file copy of the live database to
// destPath using SQLite's VACUUM INTO, which is safe to run while the app
// keeps using the database (the WAL is included). The caller picks destPath
// through the native save dialog in app.go.
func (s *SystemService) BackupDatabase(ctx context.Context, destPath string) error {
	if s.db == nil {
		return errors.New("database is not initialised")
	}
	destPath = strings.TrimSpace(destPath)
	if destPath == "" {
		return errors.New("backup path cannot be empty")
	}
	if filepath.Clean(destPath) == filepath.Clean(s.dbPath) {
		return errors.New("the backup cannot be the live database file itself")
	}
	if dir := filepath.Dir(destPath); dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create the backup directory: %w", err)
		}
	}
	// VACUUM INTO refuses an existing target; the save dialog may point at one.
	_ = os.Remove(destPath)

	// Quote the path as a SQL literal (VACUUM INTO takes an expression).
	quoted := strings.ReplaceAll(destPath, "'", "''")
	if _, err := s.db.ExecContext(ctx, fmt.Sprintf(`VACUUM INTO '%s';`, quoted)); err != nil {
		return fmt.Errorf("failed to create the backup: %w", err)
	}
	return nil
}

// RestoreBackup replaces every data table of the live database with the
// contents of backupPath (a file created by BackupDatabase). All work happens
// inside one transaction on the live database, so a failed restore leaves the
// current data completely untouched.
func (s *SystemService) RestoreBackup(ctx context.Context, backupPath string) error {
	if s.db == nil {
		return errors.New("database is not initialised")
	}
	backupPath = strings.TrimSpace(backupPath)
	if backupPath == "" {
		return errors.New("backup path cannot be empty")
	}
	if filepath.Clean(backupPath) == filepath.Clean(s.dbPath) {
		return errors.New("cannot restore the live database onto itself")
	}
	info, err := os.Stat(backupPath)
	if err != nil {
		return fmt.Errorf("backup file not found: %w", err)
	}
	if info.IsDir() {
		return errors.New("that path is a folder, not a backup file")
	}

	// Quick sanity check: every SQLite file starts with this 16-byte header.
	file, err := os.Open(backupPath)
	if err != nil {
		return fmt.Errorf("failed to read the backup file: %w", err)
	}
	header := make([]byte, len(sqliteFileHeader))
	_, readErr := io.ReadFull(file, header)
	_ = file.Close()
	if readErr != nil || string(header) != sqliteFileHeader {
		return errors.New("that file is not a valid database backup")
	}

	quoted := strings.ReplaceAll(backupPath, "'", "''")
	if _, err := s.db.ExecContext(ctx, fmt.Sprintf(`ATTACH DATABASE '%s' AS expense_backup;`, quoted)); err != nil {
		return fmt.Errorf("failed to open the backup file: %w", err)
	}
	defer func() {
		// Always detach, even after a failure (background context so a
		// cancelled caller context cannot leak the attachment).
		_, _ = s.db.ExecContext(context.Background(), `DETACH DATABASE expense_backup;`)
	}()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start the restore: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Wipe the live data first, children before parents so foreign keys never
	// complain, then copy the backup back in parent-first order.
	clearOrder := []string{"transactions", "categories", "settings", "schema_migrations"}
	fillOrder := []string{"categories", "transactions", "settings", "schema_migrations"}
	for _, table := range clearOrder {
		if _, err := tx.ExecContext(ctx, `DELETE FROM main.`+table); err != nil {
			return fmt.Errorf("failed to clear %s: %w", table, err)
		}
	}
	for _, table := range fillOrder {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(`INSERT INTO main.%s SELECT * FROM expense_backup.%s;`, table, table)); err != nil {
			return fmt.Errorf("failed to restore %s: %w", table, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit the restore: %w", err)
	}
	return nil
}

// ResetAllData erases every user data row (transactions, categories and
// settings) and resets the auto-increment counters. The schema and the applied
// migrations are kept, so the app keeps working immediately afterwards.
func (s *SystemService) ResetAllData(ctx context.Context) error {
	if s.db == nil {
		return errors.New("database is not initialised")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start the reset: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Children before parents so FK enforcement never trips; sqlite_sequence
	// makes the next inserted row start from id 1 again.
	for _, statement := range []string{
		`DELETE FROM transactions;`,
		`DELETE FROM categories;`,
		`DELETE FROM settings;`,
		`DELETE FROM sqlite_sequence;`,
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("failed to erase data: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit the reset: %w", err)
	}
	return nil
}
