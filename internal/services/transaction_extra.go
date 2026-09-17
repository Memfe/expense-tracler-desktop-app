package services

import (
	"context"
	"errors"
	"fmt"

	"expense_tracker/internal/db/sqlc"
)

// TransactionExtra holds additions to TransactionService for operations that
// need extra checks or are not part of the core CRUD flow.
type TransactionExtra struct {
	queries *sqlc.Queries
}

// NewTransactionExtra creates a TransactionExtra instance.
func NewTransactionExtra(q *sqlc.Queries) *TransactionExtra {
	return &TransactionExtra{queries: q}
}

// DeleteTransaction deletes a transaction by ID. Returns an error if the
// transaction does not exist.
func (e *TransactionExtra) DeleteTransaction(ctx context.Context, id int64) error {
	if id < 1 {
		return errors.New("invalid transaction id")
	}
	affected, err := e.queries.DeleteTransaction(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete transaction: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("transaction id does not exist: %d", id)
	}
	return nil
}