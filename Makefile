APP_NAME := expense_tracker

# The SQLite file now lives in the per-user data directory:
#   Linux:   ~/.local/share/ExpenseTracker/app.db
#   Windows: %APPDATA%\ExpenseTracker\app.db
# (override at runtime with the EXPENSE_TRACKER_DB environment variable)

# Ubuntu 24.04+/Mint 22 ships webkit2gtk-4.1 while older releases ship
# webkit2gtk-4.0, so pick the matching Wails build tag automatically.
WAILS_TAGS := $(shell pkg-config --exists webkit2gtk-4.1 && echo -tags webkit2_41)

.DEFAULT_GOAL := help

.PHONY: help dev build run build-linux deb build-windows dist test vet fmt tidy sqlc frontend clean

help: ## Show the available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

dev: ## Run the desktop app with live reload
	wails dev $(WAILS_TAGS)

build: ## Build the production desktop binary for this machine
	wails build $(WAILS_TAGS)

build-linux: ## Build the production Linux (Debian/Mint) binary in build/bin
	wails build -platform linux/amd64 $(WAILS_TAGS)

deb: ## Build the double-click installable .deb package in build/bin
	./scripts/package-deb.sh

build-windows: ## Cross-compile the Windows NSIS installer in build/bin
	wails build -platform windows/amd64 -nsis

dist: deb build-windows ## Build both installers (.deb + .exe)
	@ls -lh build/bin/

run: build ## Build the binary and launch it
	./build/bin/$(APP_NAME)

test: ## Run the Go unit tests
	go test ./...

vet: ## Run go vet
	go vet ./...

fmt: ## Format the Go sources
	gofmt -w .

tidy: ## Tidy the Go module dependencies
	go mod tidy

sqlc: ## Regenerate the sqlc query code from database/queries
	sqlc generate

frontend: ## Install and build the frontend
	cd frontend && npm install && npm run build

clean: ## Remove the build artefacts
	rm -rf build/bin frontend/dist/assets

