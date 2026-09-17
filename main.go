package main

import (
	"embed"
	"log"

	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/services"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	dbPath := services.DefaultDatabasePath

	db, err := services.InitDatabase(dbPath)
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer db.Close()

	queries := sqlc.New(db)
	allServices := services.NewServices(queries, db, dbPath)
	app := NewApp(allServices, db)

	err = wails.Run(&options.App{
		Title:  "Expense Tracker",
		Width:  1280,
		Height: 820,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 15, G: 23, B: 42, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		log.Fatal("Error:", err.Error())
	}
}
