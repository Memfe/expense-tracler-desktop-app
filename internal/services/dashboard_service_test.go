package services

import (
	"context"
	"testing"
	"time"

	"expense_tracker/internal/models"
)

func TestDashboardServiceGetDashboardData(t *testing.T) {
	ctx := context.Background()
	env := newTestEnv(t)

	for _, category := range []models.CreateCategoryRequest{
		{Name: "Salary", Type: "income"},
		{Name: "Food", Type: "expense"},
		{Name: "Rent", Type: "expense"},
	} {
		if err := env.services.Categories.CreateCategory(ctx, category); err != nil {
			t.Fatalf("CreateCategory(%s) failed: %v", category.Name, err)
		}
	}

	ids := categoryIDs(t, env)

	// Inside the tested range (September 2026).
	seedTransaction(t, env, ids["Salary"], "September salary", 250000, "2026-09-05 09:00:00")
	seedTransaction(t, env, ids["Food"], "Groceries", 20000, "2026-09-10 12:30:00")
	seedTransaction(t, env, ids["Rent"], "Hostel rent", 15000, "2026-09-30 18:00:00")

	// Outside the tested range, must never be reported.
	seedTransaction(t, env, ids["Food"], "August snack", 5000, "2026-08-20 08:00:00")

	start := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, time.September, 30, 0, 0, 0, 0, time.UTC)

	data, err := env.services.Dashboard.GetDashboardData(ctx, start, end)
	if err != nil {
		t.Fatalf("GetDashboardData() failed: %v", err)
	}

	if data.TotalIncome != 2500 {
		t.Errorf("expected total income 2500, got %v", data.TotalIncome)
	}
	if data.TotalExpense != 350 {
		t.Errorf("expected total expense 350, got %v", data.TotalExpense)
	}
	if data.NetBalance != 2150 {
		t.Errorf("expected net balance 2150, got %v", data.NetBalance)
	}

	if len(data.RecentTransactions) != 3 {
		t.Fatalf("expected 3 recent transactions, got %d", len(data.RecentTransactions))
	}
	for _, transaction := range data.RecentTransactions {
		if transaction.Description == "August snack" {
			t.Error("a transaction from outside the date range was returned")
		}
	}

	if len(data.CategoryBreakdown) != 3 {
		t.Fatalf("expected 3 category breakdown rows, got %d", len(data.CategoryBreakdown))
	}

	breakdown := make(map[string]models.CategoryBreakdownResponse, len(data.CategoryBreakdown))
	for _, row := range data.CategoryBreakdown {
		breakdown[row.CategoryName] = row
	}

	if food := breakdown["Food"]; food.Total != 200 || food.TransactionCount != 1 {
		t.Errorf("expected Food total 200 with 1 transaction, got %v with %d", food.Total, food.TransactionCount)
	}
	if salary := breakdown["Salary"]; salary.Total != 2500 || salary.CategoryType != "income" {
		t.Errorf("expected Salary total 2500 as income, got %v (%s)", salary.Total, salary.CategoryType)
	}

	if _, err := env.services.Dashboard.GetDashboardData(ctx, end, start); err == nil {
		t.Error("expected an error when the start date is after the end date")
	}
}

func TestDashboardServiceEmptyDatabase(t *testing.T) {
	ctx := context.Background()
	env := newTestEnv(t)

	start := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, time.September, 7, 0, 0, 0, 0, time.UTC)

	data, err := env.services.Dashboard.GetDashboardData(ctx, start, end)
	if err != nil {
		t.Fatalf("GetDashboardData() on an empty database failed: %v", err)
	}

	if data.TotalIncome != 0 || data.TotalExpense != 0 || data.NetBalance != 0 {
		t.Errorf("expected zeroed totals, got %+v", data)
	}
	if len(data.RecentTransactions) != 0 {
		t.Errorf("expected no recent transactions, got %d", len(data.RecentTransactions))
	}
	if len(data.CategoryBreakdown) != 0 {
		t.Errorf("expected no category breakdown rows, got %d", len(data.CategoryBreakdown))
	}
}
