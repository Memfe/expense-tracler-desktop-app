package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"expense_tracker/internal/db/sqlc"
)

// CategoryExtra holds additions to CategoryService. It is built on the
// generated sqlc queries so the delete guard lives in SQL.
type CategoryExtra struct {
	db      *sql.DB
	queries *sqlc.Queries
}

func NewCategoryExtra(db *sql.DB, q *sqlc.Queries) *CategoryExtra {
	return &CategoryExtra{db: db, queries: q}
}

// TransactionCount returns how many transactions use a category.
func (e *CategoryExtra) TransactionCount(ctx context.Context, categoryID int64) (int64, error) {
	if categoryID < 1 {
		return 0, errors.New("invalid category id")
	}
	total, err := e.queries.CountCategoryTransactions(ctx, categoryID)
	if err != nil {
		return 0, fmt.Errorf("failed to count transactions: %w", err)
	}
	return total, nil
}

// DeleteCategory deletes a category only when no transaction references it.
// The guard lives in SQL (DeleteUnusedCategory): the row is removed only if
// no transaction points at it, so the check and the delete are atomic and
// cannot race. A used or missing category yields a clear message.
func (e *CategoryExtra) DeleteCategory(ctx context.Context, id int64) error {
	if id < 1 {
		return errors.New("invalid category id")
	}
	affected, err := e.queries.DeleteUnusedCategory(ctx, sqlc.DeleteUnusedCategoryParams{
		ID:         id,
		CategoryID: id,
	})
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}
	if affected == 0 {
		used, countErr := e.TransactionCount(ctx, id)
		if countErr != nil {
			return countErr
		}
		if used > 0 {
			return fmt.Errorf("cannot delete category: %d %s still use%s it; delete those transactions first",
				used, pluralTx(used), verbTx(used))
		}
		return fmt.Errorf("category id does not exist: %d", id)
	}
	return nil
}

func pluralTx(n int64) string {
	if n == 1 {
		return "transaction"
	}
	return "transactions"
}

func verbTx(n int64) string {
	if n == 1 {
		return "s"
	}
	return ""
}