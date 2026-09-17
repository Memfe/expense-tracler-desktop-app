package services

import (
	"context"
	"testing"

	"expense_tracker/internal/models"
)

func TestSettingsServiceDefaultsAndUpdate(t *testing.T) {
	ctx := context.Background()
	env := newTestEnv(t)

	// A fresh database falls back to the documented defaults.
	defaults, err := env.services.Settings.GetAppSettings(ctx)
	if err != nil {
		t.Fatalf("GetAppSettings() failed: %v", err)
	}
	expected := models.AppSettings{
		Theme:         models.SettingDefaults[models.SettingTheme],
		Accent:        models.SettingDefaults[models.SettingAccent],
		DefaultPeriod: models.SettingDefaults[models.SettingDefaultPeriod],
		Currency:      models.SettingDefaults[models.SettingCurrency],
	}
	if defaults != expected {
		t.Errorf("expected defaults %+v, got %+v", expected, defaults)
	}

	// Valid updates are persisted and read back.
	if err := env.services.Settings.UpdateSetting(ctx, models.SettingTheme, "dark"); err != nil {
		t.Fatalf("UpdateSetting(theme) failed: %v", err)
	}
	if err := env.services.Settings.UpdateSetting(ctx, models.SettingDefaultPeriod, "last-6-months"); err != nil {
		t.Fatalf("UpdateSetting(default_period) failed: %v", err)
	}
	if err := env.services.Settings.UpdateSetting(ctx, models.SettingCurrency, "USD"); err != nil {
		t.Fatalf("UpdateSetting(currency) failed: %v", err)
	}

	updated, err := env.services.Settings.GetAppSettings(ctx)
	if err != nil {
		t.Fatalf("GetAppSettings() after update failed: %v", err)
	}
	if updated.Theme != "dark" || updated.DefaultPeriod != "last-6-months" || updated.Currency != "USD" {
		t.Errorf("expected the updated settings, got %+v", updated)
	}
	if updated.Accent != models.SettingDefaults[models.SettingAccent] {
		t.Errorf("expected the accent to keep its default, got %q", updated.Accent)
	}

	// Unknown keys and unsupported values are rejected.
	if err := env.services.Settings.UpdateSetting(ctx, "unknown_key", "value"); err == nil {
		t.Error("expected an error for an unknown setting key")
	}
	if err := env.services.Settings.UpdateSetting(ctx, models.SettingTheme, "neon"); err == nil {
		t.Error("expected an error for an unsupported theme value")
	}
	if err := env.services.Settings.UpdateSetting(ctx, models.SettingTheme, "   "); err == nil {
		t.Error("expected an error for an empty setting value")
	}

	stored, err := env.services.Settings.GetAllSettings(ctx)
	if err != nil {
		t.Fatalf("GetAllSettings() failed: %v", err)
	}
	if stored[models.SettingTheme] != "dark" {
		t.Errorf("expected the rejected updates not to be persisted, got %q", stored[models.SettingTheme])
	}

	// Resetting falls back to the defaults again.
	if err := env.services.Settings.ResetSettings(ctx); err != nil {
		t.Fatalf("ResetSettings() failed: %v", err)
	}

	afterReset, err := env.services.Settings.GetAppSettings(ctx)
	if err != nil {
		t.Fatalf("GetAppSettings() after reset failed: %v", err)
	}
	if afterReset != expected {
		t.Errorf("expected defaults after reset, got %+v", afterReset)
	}
	if stored, err := env.services.Settings.GetAllSettings(ctx); err != nil || len(stored) != 0 {
		t.Errorf("expected no stored settings after reset, got %v (err: %v)", stored, err)
	}
}

func TestSystemServiceGetSystemInfo(t *testing.T) {
	ctx := context.Background()
	env := newTestEnv(t)

	if err := env.services.Categories.CreateCategory(ctx, models.CreateCategoryRequest{
		Name: "Salary",
		Type: "income",
	}); err != nil {
		t.Fatalf("CreateCategory() failed: %v", err)
	}

	ids := categoryIDs(t, env)
	seedTransaction(t, env, ids["Salary"], "September salary", 250000, "2026-09-05 09:00:00")

	if err := env.services.Settings.UpdateSetting(ctx, models.SettingTheme, "dark"); err != nil {
		t.Fatalf("UpdateSetting() failed: %v", err)
	}

	info, err := env.services.System.GetSystemInfo(ctx)
	if err != nil {
		t.Fatalf("GetSystemInfo() failed: %v", err)
	}

	if info.DatabasePath != env.dbPath {
		t.Errorf("expected database path %q, got %q", env.dbPath, info.DatabasePath)
	}
	if len(info.Migrations) != 3 {
		t.Errorf("expected 3 applied migrations, got %d (%v)", len(info.Migrations), info.Migrations)
	}
	if info.CategoriesCount != 3 {
		t.Errorf("expected 3 categories (2 seeded + 1 created), got %d", info.CategoriesCount)
	}
	if info.TransactionsCount != 1 {
		t.Errorf("expected 1 transaction, got %d", info.TransactionsCount)
	}
	if info.SettingsCount != 1 {
		t.Errorf("expected 1 stored setting, got %d", info.SettingsCount)
	}
	if info.Engine == "" || info.Runtime == "" {
		t.Errorf("expected engine and runtime descriptions, got %q / %q", info.Engine, info.Runtime)
	}
}
