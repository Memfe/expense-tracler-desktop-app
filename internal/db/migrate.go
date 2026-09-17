package db

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"sort"
	"strings"
)

// migrationsFS ships every SQL migration inside the binary so that a fresh
// installation can bootstrap its schema without any external tooling.
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

const (
	migrationsDir     = "migrations"
	migrationsTable   = "schema_migrations"
	upMigrationSuffix = ".up.sql"
)

// Migrate creates the migration bookkeeping table (when missing) and applies
// every pending *.up.sql migration in filename order. It is idempotent, so it
// is safe to call on every application start-up.
func Migrate(database *sql.DB) error {
	if database == nil {
		return errors.New("nil database handle")
	}

	if _, err := database.Exec(fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`, migrationsTable)); err != nil {
		return fmt.Errorf("failed to create %s table: %w", migrationsTable, err)
	}

	applied, err := AppliedMigrations(database)
	if err != nil {
		return err
	}

	done := make(map[string]struct{}, len(applied))
	for _, version := range applied {
		done[version] = struct{}{}
	}

	pending, err := pendingMigrations(done)
	if err != nil {
		return err
	}

	for _, name := range pending {
		content, err := migrationsFS.ReadFile(migrationsDir + "/" + name)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", name, err)
		}
		if err := applyMigration(database, name, string(content)); err != nil {
			return err
		}
	}

	return nil
}

// AppliedMigrations returns the recorded migration versions in filename order.
func AppliedMigrations(database *sql.DB) ([]string, error) {
	rows, err := database.Query("SELECT version FROM " + migrationsTable + " ORDER BY version ASC")
	if err != nil {
		return nil, fmt.Errorf("failed to read %s: %w", migrationsTable, err)
	}
	defer rows.Close()

	versions := make([]string, 0)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan migration version: %w", err)
		}
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read migration versions: %w", err)
	}

	return versions, nil
}

// applyMigration executes a single migration file inside a transaction and
// records its version so it is never applied twice.
func applyMigration(database *sql.DB, name, content string) error {
	tx, err := database.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin migration %s: %w", name, err)
	}
	// No-op once the transaction has been committed.
	defer func() {
		_ = tx.Rollback()
	}()

	for _, statement := range splitStatements(content) {
		if _, err := tx.Exec(statement); err != nil {
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
	}

	if _, err := tx.Exec(
		fmt.Sprintf("INSERT INTO %s (version, applied_at) VALUES (?, datetime('now'))", migrationsTable),
		name,
	); err != nil {
		return fmt.Errorf("failed to record migration %s: %w", name, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration %s: %w", name, err)
	}

	return nil
}

// pendingMigrations lists the migrations that have not been applied yet.
func pendingMigrations(applied map[string]struct{}) ([]string, error) {
	entries, err := migrationsFS.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to list migrations: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), upMigrationSuffix) {
			continue
		}
		if _, ok := applied[entry.Name()]; ok {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	return names, nil
}

// splitStatements breaks a migration file into individual statements because
// SQLite only accepts a single statement per Exec call.
func splitStatements(content string) []string {
	statements := make([]string, 0, 4)

	for _, chunk := range strings.Split(content, ";") {
		lines := make([]string, 0, 4)
		for _, line := range strings.Split(chunk, "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "--") {
				continue
			}
			lines = append(lines, line)
		}

		statement := strings.TrimSpace(strings.Join(lines, "\n"))
		if statement == "" {
			continue
		}
		statements = append(statements, statement)
	}

	return statements
}
