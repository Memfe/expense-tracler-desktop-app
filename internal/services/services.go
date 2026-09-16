package services

import (
	"expense_tracker/internal/db/sqlc"
)

type Services struct {
	Categories   *CategoryService
	Transactions *TransactionService
}

func NewServices(q *sqlc.Queries) *Services {
	return &Services{
		Categories:   NewCategoryService(q),
		Transactions: NewTransactionService(q),
	}
}
