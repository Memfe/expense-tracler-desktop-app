package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"expense_tracker/internal/models"
)

// dashboardRecentLimit is how many recent transactions the dashboard shows.
const dashboardRecentLimit = 6

// DashboardService owns the read-only aggregations used by the dashboard page.
// It reuses the transaction service so the dashboard never queries the database
// directly.
type DashboardService struct {
	transactions *TransactionService
}

func NewDashboardService(transactions *TransactionService) *DashboardService {
	return &DashboardService{
		transactions: transactions,
	}
}

// GetDashboardData returns totals, the category breakdown and the most recent
// transactions for the supplied date range (both bounds inclusive).
// The four independent reads run concurrently; categories with no activity
// in the range are dropped so the chart is not noise.
func (d *DashboardService) GetDashboardData(ctx context.Context, startDate, endDate time.Time) (models.DashboardData, error) {
	if startDate.After(endDate) {
		return models.DashboardData{}, errors.New("start date must be before the end date")
	}

	type incomeRes struct {
		v   float64
		err error
	}
	type expenseRes struct {
		v   float64
		err error
	}
	type breakdownRes struct {
		v   []models.CategoryBreakdownResponse
		err error
	}
	type recentRes struct {
		v   []models.TransactionResponse
		err error
	}
	incomeCh := make(chan incomeRes, 1)
	expenseCh := make(chan expenseRes, 1)
	breakdownCh := make(chan breakdownRes, 1)
	recentCh := make(chan recentRes, 1)

	go func() {
		v, err := d.transactions.GetTotalCategoryTypeAmountByDateRange(ctx, "income", startDate, endDate)
		incomeCh <- incomeRes{v, err}
	}()
	go func() {
		v, err := d.transactions.GetTotalCategoryTypeAmountByDateRange(ctx, "expense", startDate, endDate)
		expenseCh <- expenseRes{v, err}
	}()
	go func() {
		v, err := d.transactions.GetCategoryBreakdownByDateRange(ctx, startDate, endDate)
		breakdownCh <- breakdownRes{v, err}
	}()
	go func() {
		v, _, err := d.transactions.GetTransactionByDateRange(ctx, startDate, endDate, 1, dashboardRecentLimit)
		recentCh <- recentRes{v, err}
	}()

	incomeR := <-incomeCh
	if incomeR.err != nil {
		return models.DashboardData{}, fmt.Errorf("failed to get total income: %w", incomeR.err)
	}
	expenseR := <-expenseCh
	if expenseR.err != nil {
		return models.DashboardData{}, fmt.Errorf("failed to get total expense: %w", expenseR.err)
	}
	breakdownR := <-breakdownCh
	if breakdownR.err != nil {
		return models.DashboardData{}, fmt.Errorf("failed to get category breakdown: %w", breakdownR.err)
	}
	recentR := <-recentCh
	if recentR.err != nil {
		return models.DashboardData{}, fmt.Errorf("failed to get recent transactions: %w", recentR.err)
	}

	breakdown := make([]models.CategoryBreakdownResponse, 0, len(breakdownR.v))
	for _, row := range breakdownR.v {
		if row.TransactionCount == 0 {
			continue
		}
		breakdown = append(breakdown, row)
	}
	recent := recentR.v
	if recent == nil {
		recent = []models.TransactionResponse{}
	}

	return models.DashboardData{
		TotalIncome:        incomeR.v,
		TotalExpense:       expenseR.v,
		NetBalance:         incomeR.v - expenseR.v,
		CategoryBreakdown:  breakdown,
		RecentTransactions: recent,
	}, nil
}
