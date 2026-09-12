package services

import (
	"database/sql"
	"expense_tracker/internal/db/sqlc"
)

type TransactionService struct {
	queries *sqlc.Queries
	db      *sql.DB
}

func NewTransactionService(q *sqlc.Queries, db *sql.DB) *TransactionService {
	return &TransactionService{
		queries: q,
		db:      db,
	}
}
