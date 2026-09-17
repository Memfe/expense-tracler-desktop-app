package services

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	"expense_tracker/internal/db/sqlc"
)

// testEnv bundles everything a service test needs: a freshly migrated database
// in a temporary directory plus the services container built on top of it.
type testEnv struct {
	services *Services
	db       *sql.DB
	dbPath   string
}

func newTestEnv(t *testing.T) testEnv {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "app.db")

	database, err := InitDatabase(dbPath)
	if err != nil {
		t.Fatalf("InitDatabase() failed: %v", err)
	}
	t.Cleanup(func() {
		database.Close()
	})

	return testEnv{
		services: NewServices(sqlc.New(database), database, dbPath),
		db:       database,
		dbPath:   dbPath,
	}
}

// seedTransaction inserts a transaction with an explicit date so tests stay
// independent from the SQLite default of "now".
func seedTransaction(t *testing.T, env testEnv, categoryID int64, description string, amount int64, date string) {
	t.Helper()

	if _, err := env.db.Exec(
		`INSERT INTO transactions (category_id, description, amount, transaction_date) VALUES (?, ?, ?, ?)`,
		categoryID, description, amount, date,
	); err != nil {
		t.Fatalf("failed to seed transaction %q: %v", description, err)
	}
}

// categoryIDs returns the category ids keyed by name.
func categoryIDs(t *testing.T, env testEnv) map[string]int64 {
	t.Helper()

	categories, err := env.services.Categories.GetAllCategories(context.Background())
	if err != nil {
		t.Fatalf("GetAllCategories() failed: %v", err)
	}

	ids := make(map[string]int64, len(categories))
	for _, category := range categories {
		ids[category.Name] = category.ID
	}

	return ids
}
