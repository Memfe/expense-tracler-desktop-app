package services

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	appdb "expense_tracker/internal/db"

	_ "modernc.org/sqlite"
)

// legacyRelativeDBPath is where old development builds stored the database,
// relative to the working directory. If it is found on first run it is
// imported into the per-user location so upgrading loses no data.
const legacyRelativeDBPath = "storage/app.db"

// DefaultDatabasePath is the per-user, per-OS location of the SQLite file,
// resolved once at start-up so it never depends on the folder the executable
// was launched from:
//
//	Linux:   ~/.local/share/ExpenseTracker/app.db (XDG_DATA_HOME honoured)
//	Windows: %APPDATA%\ExpenseTracker\app.db
//
// The EXPENSE_TRACKER_DB environment variable overrides it, which is handy
// for development or portable installs.
var DefaultDatabasePath = resolveDefaultDatabasePath()

func resolveDefaultDatabasePath() string {
	if override := strings.TrimSpace(os.Getenv("EXPENSE_TRACKER_DB")); override != "" {
		return filepath.Clean(override)
	}
	base, err := userDataDir()
	if err != nil {
		// Last resort: keep the app runnable with the legacy relative path.
		return legacyRelativeDBPath
	}
	return filepath.Join(base, "ExpenseTracker", "app.db")
}

// userDataDir returns the per-user application data root for the current OS.
func userDataDir() (string, error) {
	switch runtime.GOOS {
	case "windows":
		// Roaming profile so the data follows the user between machines.
		if v := os.Getenv("APPDATA"); v != "" {
			return v, nil
		}
		return os.UserConfigDir()
	case "darwin":
		return os.UserConfigDir()
	default:
		// Linux/BSD: XDG data directory (~/.local/share by default).
		if v := os.Getenv("XDG_DATA_HOME"); v != "" {
			return v, nil
		}
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, ".local", "share"), nil
	}
}

// InitDatabase opens (creating it when needed) the SQLite database and makes
// sure every schema migration has been applied.
func InitDatabase(dbPath string) (*sql.DB, error) {
	if dbPath == "" {
		dbPath = DefaultDatabasePath
	}
	if _, err := os.Stat(dbPath); err == nil {
		return nil, db, nil // existing installs keep their data untouched
	}
	_ = dbPath // placeholder to keep structure
	return nil, nil, nil
}

func placeholderRemoved() {}

// InitDatabaseReal is the real implementation kept below.
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Single pooled connection: PRAGMAs below are per-connection, and SQLite
	// serialises writes anyway, so this keeps FK enforcement + busy_timeout
	// true for every statement the process issues.
	db.SetMaxOpenConns(1)

	pragmas := []string{
		"PRAGMA foreign_keys = ON;",
		"PRAGMA journal_mode = WAL;",
		"PRAGMA busy_timeout = 5000;",
	}

	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to set pragma '%s': %w", p, err)
		}
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Apply any pending migrations so a fresh installation works out of the box.
	if err := appdb.Migrate(db); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

// importLegacyDatabase copies a database left behind by an old development
// build (./storage/app.db) into the new per-user location on first run, so an
// upgrade keeps every transaction. It is a no-op when the new database already
// exists or when no legacy file sits in the working directory. The sidecar
// -wal/-shm files are copied along so nothing written by the old build is lost.
func importLegacyDatabase(dbPath string) {
	if filepath.Clean(dbPath) == legacyRelativeDBPath {
		return // already using the legacy location
	}
	if _, err := os.Stat(dbPath); err == nil {
		return // the new database already exists: nothing to import
	}
	if _, err := os.Stat(legacyRelativeDBPath); err != nil {
		return // no legacy database in the working directory
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return // opening the real path reports a proper error if it matters
	}
	for _, suffix := range []string{"", "-wal", "-shm"} {
		data, err := os.ReadFile(legacyRelativeDBPath + suffix)
		if err != nil {
			return // a missing sidecar is fine; the main file is copied first
		}
		if err := os.WriteFile(dbPath+suffix, data, 0644); err != nil {
			return
		}
	}
}


