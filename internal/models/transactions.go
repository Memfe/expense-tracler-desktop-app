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
	ID              int64
	CategoryID      int64
	Description     string
	Amount          float64
	TransactionDate string
	CategoryName    string
	CategoryType    string
}
