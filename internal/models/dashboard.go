package models

// DashboardData is everything the dashboard page needs for a single date range.
type DashboardData struct {
	TotalIncome        float64                     `json:"total_income"`
	TotalExpense       float64                     `json:"total_expense"`
	NetBalance         float64                     `json:"net_balance"`
	CategoryBreakdown  []CategoryBreakdownResponse `json:"category_breakdown"`
	RecentTransactions []TransactionResponse       `json:"recent_transactions"`
}

// PaginatedTransactions wraps a page of transactions together with its total
// count so the frontend can render pagination controls.
type PaginatedTransactions struct {
	Transactions []TransactionResponse `json:"transactions"`
	Total        int64                 `json:"total"`
	Page         int64                 `json:"page"`
	PageSize     int64                 `json:"page_size"`
}
