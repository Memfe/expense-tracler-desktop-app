package services

import (
	"context"
	"database/sql"
	"errors"
	"expense_tracker/internal/converters"
	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/models"
	"expense_tracker/internal/utils"
	"fmt"
	"strings"
	"time"
)

type TransactionService struct {
	queries *sqlc.Queries
}

func NewTransactionService(q *sqlc.Queries, db *sql.DB) *TransactionService {
	return &TransactionService{
		queries: q,
	}
}

func (t *TransactionService) CreateTransaction(ctx context.Context, req models.CreateTransactionRequest) error {
	if err := utils.Validator.Struct(req); err != nil {
		return errors.New(utils.ValidationMessage(err))
	}

	params := sqlc.CreateTransactionParams{
		CategoryID:  req.CategoryID,
		Description: req.Description,
		Amount:      utils.ToPesewas(req.Amount),
	}
	err := t.queries.CreateTransaction(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}
	return nil
}

func (t *TransactionService) EditTransaction(ctx context.Context, req models.EditTransactionRequest) error {
	if err := utils.Validator.Struct(req); err != nil {
		return errors.New(utils.ValidationMessage(err))
	}

	params := sqlc.EditTransactionParams{
		Description: req.Description,
		Amount:      utils.ToPesewas(req.Amount),
		ID:          req.ID,
	}

	err := t.queries.EditTransaction(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to edit transaction: %w", err)
	}
	return nil
}

func (t *TransactionService) GetAllTransactions(ctx context.Context, page int, pageSize int, query string) ([]models.TransactionResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	query = strings.TrimSpace(query)
	offset := (page - 1) * pageSize

	params := sqlc.GetAllTransactionsParams{
		Search: query,
		Limit:  int64(pageSize),
		Offset: int64(offset),
	}

	transactions, err := t.queries.GetAllTransactions(ctx, params)
	if err != nil {
		return nil, 0, errors.New("failed to get transactions")
	}

	total, err := t.queries.CountTransactions(ctx, query)
	if err != nil {
		return nil, 0, errors.New("failed to count transactions")
	}
	return converters.ToTransactionResponses(transactions), total, nil
}

func (t *TransactionService) GetTotalCategoryIDAmountByDateRange(ctx context.Context, CategoryID int64, startDate, endDate time.Time) (float64, error) {
	if CategoryID < 1 {
		return 0, errors.New(
			"invalid category id",
		)
	}

	startDate = utils.StartDate(startDate)
	endDate = utils.StartDate(endDate)

	if startDate.After(endDate) {
		return 0, errors.New("start date must be before the end date")
	}

	endDate = endDate.AddDate(0, 0, 1)

	params := sqlc.GetTotalCategoryIDAmountByDateRangeParams{
		ID:                CategoryID,
		TransactionDate:   startDate.Format("2006-01-02"),
		TransactionDate_2: endDate.Format("2006-01-02"),
	}

	transactionAmount, err := t.queries.GetTotalCategoryIDAmountByDateRange(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("failed to get total amount: %w", err)
	}
	total, ok := transactionAmount.(int64)
	if !ok {
		return 0, errors.New("unexpected type for transaction total name")
	}
	return utils.ToCedis(total), nil
}

func (t *TransactionService) GetTotalCategoryTypeAmountByDateRange(ctx context.Context, categoryType string, startDate, endDate time.Time) (float64, error) {
	if categoryType != "income" && categoryType != "expenses" {
		return 0, fmt.Errorf("invalid transaction type: %s", categoryType)
	}

	startDate = utils.StartDate(startDate)
	endDate = utils.StartDate(endDate)

	if startDate.After(endDate) {
		return 0, errors.New("start date must be before the end date")
	}

	endDate = endDate.AddDate(0, 0, 1)

	params := sqlc.GetTotalCategoryTypeAmountByDateRangeParams{
		Type:              categoryType,
		TransactionDate:   startDate.Format("2006-01-02"),
		TransactionDate_2: endDate.Format("2006-01-02"),
	}

	amount, err := t.queries.GetTotalCategoryTypeAmountByDateRange(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("failed to get total amount: %w", err)
	}

	total, ok := amount.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected type for transaction total: %T", amount)
	}

	return utils.ToCedis(total), nil
}

func (t *TransactionService) getTransactionByDateRange(ctx context.Context) ([]models.TransactionResponse, error) {

}
