package services

import (
	"database/sql"
	"expense_tracker/internal/db/sqlc"
)

type Services struct {
	db      *sql.DB
	queries sqlc.Queries
}
