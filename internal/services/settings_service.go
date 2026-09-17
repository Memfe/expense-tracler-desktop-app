package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"expense_tracker/internal/models"
)

// SettingsService reads and writes the key/value settings stored in SQLite.
type SettingsService struct {
	db     *sql.DB
	dbPath string
}

func NewSettingsService(db *sql.DB, dbPath string) *SettingsService {
	if dbPath == "" {
		dbPath = DefaultDatabasePath
	}
	return &SettingsService{
		db:     db,
		dbPath: dbPath,
	}
}

// DatabasePath is the SQLite file the application is currently using.
func (s *SettingsService) DatabasePath() string {
	return s.dbPath
}

// GetAllSettings returns every persisted setting, without the defaults.
func (s *SettingsService) GetAllSettings(ctx context.Context) (map[string]string, error) {
	const query = `SELECT key, value FROM settings;`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch settings: %w", err)
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, val string
		if err := rows.Scan(&key, &val); err != nil {
			return nil, fmt.Errorf("failed to scan setting: %w", err)
		}
		settings[key] = val
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading settings: %w", err)
	}

	return settings, nil
}

// GetAppSettings returns the settings used by the application, falling back to
// the defaults for any key that has not been stored yet.
func (s *SettingsService) GetAppSettings(ctx context.Context) (models.AppSettings, error) {
	all, err := s.GetAllSettings(ctx)
	if err != nil {
		return models.AppSettings{}, err
	}

	return models.AppSettings{
		Theme:         s.valueOrDefault(all, models.SettingTheme),
		Accent:        s.valueOrDefault(all, models.SettingAccent),
		DefaultPeriod: s.valueOrDefault(all, models.SettingDefaultPeriod),
		Currency:      s.valueOrDefault(all, models.SettingCurrency),
	}, nil
}

// UpdateSetting validates and upserts a single setting.
func (s *SettingsService) UpdateSetting(ctx context.Context, key, value string) error {
	key = strings.TrimSpace(key)
	value = strings.TrimSpace(value)

	if key == "" {
		return errors.New("setting key cannot be empty")
	}
	if value == "" {
		return fmt.Errorf("value for setting '%s' cannot be empty", key)
	}

	allowed, known := models.AllowedSettingValues[key]
	if !known {
		return fmt.Errorf("unknown setting key: %s", key)
	}
	if !contains(allowed, value) {
		return fmt.Errorf("invalid value '%s' for setting '%s'", value, key)
	}

	const query = `
	INSERT INTO settings (key, value, updated_at)
	VALUES (?, ?, datetime('now'))
	ON CONFLICT(key) DO UPDATE SET
		value = excluded.value,
		updated_at = excluded.updated_at;
	`
	if _, err := s.db.ExecContext(ctx, query, key, value); err != nil {
		return fmt.Errorf("failed to update setting '%s': %w", key, err)
	}

	return nil
}

// ResetSettings removes every stored setting so the defaults apply again.
func (s *SettingsService) ResetSettings(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM settings;`); err != nil {
		return fmt.Errorf("failed to reset settings: %w", err)
	}
	return nil
}

func (s *SettingsService) valueOrDefault(all map[string]string, key string) string {
	if value, ok := all[key]; ok && value != "" {
		return value
	}
	return models.SettingDefaults[key]
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
