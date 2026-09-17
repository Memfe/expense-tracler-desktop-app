package converters

import (
	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/models"
	"expense_tracker/internal/utils"
)

func ToTransactionResponse(transaction sqlc.GetAllTransactionsRow) models.TransactionResponse {
	return models.TransactionResponse{
		ID:              transaction.ID,
		CategoryID:      transaction.CategoryID,
		Description:     transaction.Description,
		Amount:          utils.ToCedis(transaction.Amount),
		TransactionDate: transaction.TransactionDate,
		CategoryName:    transaction.CategoryName,
		CategoryType:    transaction.CategoryType,
	}
}

func ToTransactionResponses(transactions []sqlc.GetAllTransactionsRow) []models.TransactionResponse {
	res := make([]models.TransactionResponse, 0, len(transactions))

	for _, transaction := range transactions {
		res = append(res, ToTransactionResponse(transaction))
	}
	return res
}

func ToTransactionByIDResponse(transaction sqlc.GetTransactionByIDRow) models.TransactionResponse {
	return models.TransactionResponse{
		ID:              transaction.ID,
		CategoryID:      transaction.CategoryID,
		Description:     transaction.Description,
		Amount:          utils.ToCedis(transaction.Amount),
		TransactionDate: transaction.TransactionDate,
		CategoryName:    transaction.CategoryName,
		CategoryType:    transaction.CategoryType,
	}
}

func ToTransactionByDateRangeResponse(transaction sqlc.GetTransactionByDateRangeRow) models.TransactionResponse {
	return models.TransactionResponse{
		ID:              transaction.ID,
		CategoryID:      transaction.CategoryID,
		Description:     transaction.Description,
		Amount:          utils.ToCedis(transaction.Amount),
		TransactionDate: transaction.TransactionDate,
		CategoryName:    transaction.CategoryName,
		CategoryType:    transaction.CategoryType,
	}
}

func ToTransactionByDateRangeResponses(transactions []sqlc.GetTransactionByDateRangeRow) []models.TransactionResponse {
	res := make([]models.TransactionResponse, 0, len(transactions))

	for _, transaction := range transactions {
		res = append(res, ToTransactionByDateRangeResponse(transaction))
	}
	return res
}

func ToTransactionByCategoryTypeResponse(transaction sqlc.GetTransactionsByCategoryTypeRow) models.TransactionResponse {
	return models.TransactionResponse{
		ID:              transaction.ID,
		CategoryID:      transaction.CategoryID,
		Description:     transaction.Description,
		Amount:          utils.ToCedis(transaction.Amount),
		TransactionDate: transaction.TransactionDate,
		CategoryName:    transaction.CategoryName,
		CategoryType:    transaction.CategoryType,
	}
}

func ToTransactionByCategoryTypeResponses(transactions []sqlc.GetTransactionsByCategoryTypeRow) []models.TransactionResponse {
	res := make([]models.TransactionResponse, 0, len(transactions))

	for _, transaction := range transactions {
		res = append(res, ToTransactionByCategoryTypeResponse(transaction))
	}
	return res
}

func ToTransactionByCategoryIDResponse(transaction sqlc.GetTransactionsByCategoryIDRow) models.TransactionResponse {
	return models.TransactionResponse{
		ID:              transaction.ID,
		CategoryID:      transaction.CategoryID,
		Description:     transaction.Description,
		Amount:          utils.ToCedis(transaction.Amount),
		TransactionDate: transaction.TransactionDate,
		CategoryName:    transaction.CategoryName,
		CategoryType:    transaction.CategoryType,
	}
}

func ToTransactionByCategoryIDResponses(transactions []sqlc.GetTransactionsByCategoryIDRow) []models.TransactionResponse {
	res := make([]models.TransactionResponse, 0, len(transactions))

	for _, transaction := range transactions {
		res = append(res, ToTransactionByCategoryIDResponse(transaction))
	}
	return res
}

func ToCategoryBreakdownResponse(row sqlc.GetCategoryBreakdownByDateRangeRow) models.CategoryBreakdownResponse {
	return models.CategoryBreakdownResponse{
		CategoryID:       row.CategoryID,
		CategoryName:     row.CategoryName,
		CategoryType:     row.CategoryType,
		Total:            utils.ToCedis(row.Total),
		TransactionCount: row.TransactionCount,
	}
}

func ToCategoryBreakdownResponses(rows []sqlc.GetCategoryBreakdownByDateRangeRow) []models.CategoryBreakdownResponse {
	res := make([]models.CategoryBreakdownResponse, 0, len(rows))
	for _, row := range rows {
		res = append(res, ToCategoryBreakdownResponse(row))
	}
	return res
}
