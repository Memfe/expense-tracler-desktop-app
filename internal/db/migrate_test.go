package db

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func TestMigrateCreatesSchemaAndIsIdempotent(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "app.db")
	database, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}
	defer database.Close()

	if err := Migrate(database); err != nil {
		t.Fatalf("first Migrate() failed: %v", err)
	}

	for _, table := range []string{"schema_migrations", "categories", "transactions", "settings"} {
		var name string
		err := database.QueryRow(
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table,
		).Scan(&name)
		if err != nil {
			t.Fatalf("expected table %q to exist: %v", table, err)
		}
	}

	applied, err := AppliedMigrations(database)
	if err != nil {
		t.Fatalf("AppliedMigrations() failed: %v", err)
	}
	if len(applied) != 3 {
		t.Fatalf("expected 3 applied migrations, got %d (%v)", len(applied), applied)
	}
	if applied[0] != "000001_create_transactions_table.up.sql" {
		t.Errorf("unexpected first migration: %s", applied[0])
	}
	if applied[1] != "000002_create_settings_table.up.sql" {
		t.Errorf("unexpected second migration: %s", applied[1])
	}
	if applied[2] != "000003_seed_and_indexes.up.sql" {
		t.Errorf("unexpected third migration: %s", applied[2])
	}

	// Running the migrations again must not fail and must not add duplicates.
	if err := Migrate(database); err != nil {
		t.Fatalf("second Migrate() failed: %v", err)
	}

	reapplied, err := AppliedMigrations(database)
	if err != nil {
		t.Fatalf("AppliedMigrations() after re-run failed: %v", err)
	}
	if len(reapplied) != len(applied) {
		t.Fatalf("expected %d applied migrations after re-run, got %d", len(applied), len(reapplied))
	}

	// The settings table must be usable straight after migrating.
	if _, err := database.Exec(
		`INSERT INTO settings (key, value) VALUES ('theme', 'dark')`,
	); err != nil {
		t.Fatalf("failed to insert into settings: %v", err)
	}
}

func TestSplitStatements(t *testing.T) {
	content := `
-- a comment
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS demo(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE INDEX idx_demo_name ON demo(name);
`

	statements := splitStatements(content)
	if len(statements) != 3 {
		t.Fatalf("expected 3 statements, got %d: %#v", len(statements), statements)
	}
	if statements[0] != "PRAGMA foreign_keys = ON" {
		t.Errorf("unexpected first statement: %q", statements[0])
	}
}
