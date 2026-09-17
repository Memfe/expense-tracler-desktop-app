package models

type CreateTransactionRequest struct {
	CategoryID  int64   `json:"category_id" validate:"required,gt=0"`
	Description string  `json:"description" validate:"required,min=2"`
	Amount      float64 `json:"amount" validate:"required,gt=0"`
}

type EditTransactionRequest struct {
	Description string  `json:"description" validate:"required,min=2"`
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	ID          int64   `json:"id" validate:"required,gt=0"`
}

type TransactionResponse struct {
	ID              int64   `json:"id"`
	CategoryID      int64   `json:"category_id"`
	Description     string  `json:"description"`
	Amount          float64 `json:"amount"`
	TransactionDate string  `json:"transaction_date"`
	CategoryName    string  `json:"category_name"`
	CategoryType    string  `json:"category_type"`
}

type CategoryBreakdownResponse struct {
	CategoryID       int64   `json:"category_id"`
	CategoryName     string  `json:"category_name"`
	CategoryType     string  `json:"category_type"`
	Total            float64 `json:"total"`
	TransactionCount int64   `json:"transaction_count"`
}
