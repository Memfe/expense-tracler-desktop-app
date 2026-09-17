package models

// Setting keys persisted in the settings table.
const (
	SettingTheme         = "theme"
	SettingAccent        = "accent"
	SettingDefaultPeriod = "default_period"
	SettingCurrency      = "currency"
)

// SettingDefaults is used whenever a key has not been persisted yet.
var SettingDefaults = map[string]string{
	SettingTheme:         "light",
	SettingAccent:        "amber",
	SettingDefaultPeriod: "this-week",
	SettingCurrency:      "GHS",
}

// AllowedSettingValues keeps stored settings aligned with the options offered by
// the settings page, so a bad value can never be written to the database.
var AllowedSettingValues = map[string][]string{
	SettingTheme:         {"light", "dark", "system"},
	SettingAccent:        {"amber", "emerald", "indigo", "violet", "rose", "blue"},
	SettingDefaultPeriod: {"today", "this-week", "this-month", "last-6-months"},
	SettingCurrency:      {"GHS", "USD", "EUR", "GBP"},
}

type SettingItem struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	UpdatedAt string `json:"updated_at"`
}

type UpdateSettingRequest struct {
	Key   string `json:"key" validate:"required"`
	Value string `json:"value" validate:"required"`
}

type AppSettings struct {
	Theme         string `json:"theme"`
	Accent        string `json:"accent"`
	DefaultPeriod string `json:"default_period"`
	Currency      string `json:"currency"`
}

// SystemInfo holds the read-only environment details shown on the settings page.
type SystemInfo struct {
	DatabasePath      string   `json:"database_path"`
	Engine            string   `json:"engine"`
	Runtime           string   `json:"runtime"`
	Migrations        []string `json:"migrations"`
	CategoriesCount   int64    `json:"categories_count"`
	TransactionsCount int64    `json:"transactions_count"`
	SettingsCount     int64    `json:"settings_count"`
}
