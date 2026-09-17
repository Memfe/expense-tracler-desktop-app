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

func NewTransactionService(q *sqlc.Queries) *TransactionService {
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

func (t *TransactionService) GetAllTransactions(ctx context.Context, page int64, pageSize int64, query string) ([]models.TransactionResponse, int64, error) {
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
		Limit:  pageSize,
		Offset: offset,
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
		return 0, errors.New("unexpected type for transaction total")
	}
	return utils.ToCedis(total), nil
}

func (t *TransactionService) GetTotalCategoryTypeAmountByDateRange(ctx context.Context, categoryType string, startDate, endDate time.Time) (float64, error) {
	if categoryType != "income" && categoryType != "expense" {
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

func (t *TransactionService) GetTransactionByDateRange(ctx context.Context, startDate, endDate time.Time, page, pageSize int64) ([]models.TransactionResponse, int64, error) {
	startDate = utils.StartDate(startDate)
	endDate = utils.StartDate(endDate)

	if startDate.After(endDate) {
		return nil, 0, errors.New("start date must be before the end date")
	}

	endDate = endDate.AddDate(0, 0, 1)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	params := sqlc.GetTransactionByDateRangeParams{
		TransactionDate:   startDate.Format("2006-01-02"),
		TransactionDate_2: endDate.Format("2006-01-02"),
		Limit:             pageSize,
		Offset:            offset,
	}

	transactions, err := t.queries.GetTransactionByDateRange(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get transactions: %w", err)
	}
	params2 := sqlc.CountTransactionsByDateRangeParams{
		TransactionDate:   startDate.Format("2006-01-02"),
		TransactionDate_2: endDate.Format("2006-01-02"),
	}

	total, err := t.queries.CountTransactionsByDateRange(ctx, params2)
	if err != nil {
		return nil, 0, errors.New("failed to count transactions")
	}

	return converters.ToTransactionByDateRangeResponses(transactions), total, nil
}

func (t *TransactionService) GetTransactionByID(ctx context.Context, id int64) (models.TransactionResponse, error) {
	if id < 1 {
		return models.TransactionResponse{}, errors.New("invalid transaction id")
	}
	transaction, err := t.queries.GetTransactionByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.TransactionResponse{}, fmt.Errorf("transaction id does not exist: %w", err)
		}
		return models.TransactionResponse{}, fmt.Errorf("failed to fetch transaction: %w", err)
	}
	return converters.ToTransactionByIDResponse(transaction), nil
}

func (t *TransactionService) GetTransactionsByCategoryID(ctx context.Context, categoryID, page, pageSize int64) ([]models.TransactionResponse, int64, error) {
	if categoryID < 1 {
		return nil, 0, errors.New("invalid transaction id")
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	params := sqlc.GetTransactionsByCategoryIDParams{
		CategoryID: categoryID,
		Limit:      pageSize,
		Offset:     offset,
	}

	transactions, err := t.queries.GetTransactionsByCategoryID(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	total, err := t.queries.CountTransactionsByCategoryID(ctx, categoryID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	return converters.ToTransactionByCategoryIDResponses(transactions), total, nil
}

func (t *TransactionService) GetTransactionsByCategoryType(ctx context.Context, categoryType string, page, pageSize int64) ([]models.TransactionResponse, int64, error) {
	if categoryType != "income" && categoryType != "expense" {
		return nil, 0, errors.New("invalid category type")
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	params := sqlc.GetTransactionsByCategoryTypeParams{
		Type:   categoryType,
		Limit:  pageSize,
		Offset: offset,
	}

	transactions, err := t.queries.GetTransactionsByCategoryType(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	total, err := t.queries.CountTransactionsByCategoryType(ctx, categoryType)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	return converters.ToTransactionByCategoryTypeResponses(transactions), total, nil
}

func (t *TransactionService) GetCategoryBreakdownByDateRange(ctx context.Context, startDate, endDate time.Time) ([]models.CategoryBreakdownResponse, error) {
	startDate = utils.StartDate(startDate)
	endDate = utils.StartDate(endDate)

	if startDate.After(endDate) {
		return nil, errors.New("start date must be before the end date")
	}

	// Move to next day midnight so the whole end day is included
	endDate = endDate.AddDate(0, 0, 1)

	params := sqlc.GetCategoryBreakdownByDateRangeParams{
		TransactionDate:   startDate.Format("2006-01-02"),
		TransactionDate_2: endDate.Format("2006-01-02"),
	}

	breakdown, err := t.queries.GetCategoryBreakdownByDateRange(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to get category breakdown: %w", err)
	}

	return converters.ToCategoryBreakdownResponses(breakdown), nil
}
