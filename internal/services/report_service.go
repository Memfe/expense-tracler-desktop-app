package services

import (
"context"
"database/sql"
"errors"
"fmt"
"os"
"path/filepath"
"time"

"github.com/jung-kurt/gofpdf"
"expense_tracker/internal/db/sqlc"
"expense_tracker/internal/utils"
)

// ReportService generates PDF reports for income and expenses.
type ReportService struct {
db      *sql.DB
queries *sqlc.Queries
}

// NewReportService creates a new ReportService.
func NewReportService(db *sql.DB, queries *sqlc.Queries) *ReportService {
return &ReportService{
db:      db,
queries: queries,
}
}

// ReportData contains the data needed for a report.
type ReportData struct {
StartDate    string
EndDate      string
TotalIncome  float64
TotalExpense float64
NetBalance   float64
IncomeItems  []ReportItem
ExpenseItems []ReportItem
}

// ReportItem represents a single transaction in the report.
type ReportItem struct {
Date        string
Description string
Category    string
Amount      float64
}

// GenerateReport creates a PDF report for the specified date range and saves it
// to the given path.
func (s *ReportService) GenerateReport(ctx context.Context, startDate, endDate string, destPath string) error {
if s.db == nil {
return errors.New("database is not initialised")
}

start, err := time.Parse("2006-01-02", startDate)
if err != nil {
return fmt.Errorf("invalid start date: %w", err)
}
end, err := time.Parse("2006-01-02", endDate)
if err != nil {
return fmt.Errorf("invalid end date: %w", err)
}

data, err := s.getReportData(ctx, start, end)
if err != nil {
return fmt.Errorf("failed to get report data: %w", err)
}

dir := filepath.Dir(destPath)
if err := os.MkdirAll(dir, 0755); err != nil {
return fmt.Errorf("failed to create directory: %w", err)
}

if err := s.createPDF(destPath, data); err != nil {
return fmt.Errorf("failed to create PDF: %w", err)
}

return nil
}

func (s *ReportService) getReportData(ctx context.Context, start, end time.Time) (*ReportData, error) {
incomeTotal, err := s.queries.GetTotalCategoryTypeAmountByDateRange(ctx, sqlc.GetTotalCategoryTypeAmountByDateRangeParams{
Type:             "income",
TransactionDate:  start.Format("2006-01-02"),
TransactionDate_2: end.AddDate(0, 0, 1).Format("2006-01-02"),
})
if err != nil {
return nil, fmt.Errorf("failed to get income total: %w", err)
}

expenseTotal, err := s.queries.GetTotalCategoryTypeAmountByDateRange(ctx, sqlc.GetTotalCategoryTypeAmountByDateRangeParams{
Type:             "expense",
TransactionDate:  start.Format("2006-01-02"),
TransactionDate_2: end.AddDate(0, 0, 1).Format("2006-01-02"),
})
if err != nil {
return nil, fmt.Errorf("failed to get expense total: %w", err)
}

incomeCedis := utils.ToCedis(incomeTotal.(int64))
expenseCedis := utils.ToCedis(expenseTotal.(int64))

incomeRows, err := s.queries.GetTransactionsByCategoryType(ctx, sqlc.GetTransactionsByCategoryTypeParams{
Type:  "income",
Limit: 1000,
})
if err != nil {
return nil, fmt.Errorf("failed to get income transactions: %w", err)
}

expenseRows, err := s.queries.GetTransactionsByCategoryType(ctx, sqlc.GetTransactionsByCategoryTypeParams{
Type:  "expense",
Limit: 1000,
})
if err != nil {
return nil, fmt.Errorf("failed to get expense transactions: %w", err)
}

var incomeItems []ReportItem
for _, row := range incomeRows {
txDate, _ := time.Parse("2006-01-02 15:04:05", row.TransactionDate)
if !txDate.Before(start) && txDate.Before(end.AddDate(0, 0, 1)) {
incomeItems = append(incomeItems, ReportItem{
Date:        txDate.Format("2006-01-02"),
Description: row.Description,
Category:    row.CategoryName,
Amount:      utils.ToCedis(row.Amount),
})
}
}

var expenseItems []ReportItem
for _, row := range expenseRows {
txDate, _ := time.Parse("2006-01-02 15:04:05", row.TransactionDate)
if !txDate.Before(start) && txDate.Before(end.AddDate(0, 0, 1)) {
expenseItems = append(expenseItems, ReportItem{
Date:        txDate.Format("2006-01-02"),
Description: row.Description,
Category:    row.CategoryName,
Amount:      utils.ToCedis(row.Amount),
})
}
}

return &ReportData{
StartDate:    start.Format("2006-01-02"),
EndDate:      end.Format("2006-01-02"),
TotalIncome:  incomeCedis,
TotalExpense: expenseCedis,
NetBalance:   incomeCedis - expenseCedis,
IncomeItems:  incomeItems,
ExpenseItems: expenseItems,
}, nil
}

func (s *ReportService) createPDF(destPath string, data *ReportData) error {
pdf := gofpdf.New("P", "mm", "A4", "")
pdf.SetTitle("Expense Report", true)
pdf.SetAuthor("Expense Tracker", true)

pdf.AddPage()
pdf.SetFont("Helvetica", "B", 20)
pdf.Cell(0, 10, "Expense Report")
pdf.Ln(15)

pdf.SetFont("Helvetica", "", 12)
pdf.Cell(0, 8, fmt.Sprintf("Period: %s to %s", data.StartDate, data.EndDate))
pdf.Ln(10)

pdf.Ln(5)
pdf.SetFont("Helvetica", "B", 14)
pdf.Cell(0, 8, "Summary")
pdf.Ln(12)

pdf.SetFont("Helvetica", "", 11)
pdf.SetFillColor(200, 230, 200)
pdf.Cell(90, 7, "Total Income:")
pdf.SetFont("Helvetica", "B", 11)
pdf.Cell(50, 7, fmt.Sprintf("%.2f GHS", data.TotalIncome))
pdf.Ln(8)

pdf.SetFont("Helvetica", "", 11)
pdf.SetFillColor(255, 200, 200)
pdf.Cell(90, 7, "Total Expenses:")
pdf.SetFont("Helvetica", "B", 11)
pdf.Cell(50, 7, fmt.Sprintf("%.2f GHS", data.TotalExpense))
pdf.Ln(8)

pdf.SetFont("Helvetica", "", 11)
pdf.SetFillColor(200, 200, 255)
pdf.Cell(90, 7, "Net Balance:")
pdf.SetFont("Helvetica", "B", 11)
if data.NetBalance >= 0 {
pdf.SetFillColor(200, 230, 200)
} else {
pdf.SetFillColor(255, 200, 200)
}
pdf.Cell(50, 7, fmt.Sprintf("%.2f GHS", data.NetBalance))
pdf.Ln(15)

pdf.SetFont("Helvetica", "B", 14)
pdf.SetFillColor(255, 255, 255)
pdf.Cell(0, 8, "Income Details")
pdf.Ln(12)

if len(data.IncomeItems) == 0 {
pdf.SetFont("Helvetica", "I", 10)
pdf.Cell(0, 6, "No income transactions in this period")
pdf.Ln(8)
} else {
s.drawTransactionTable(pdf, data.IncomeItems)
}

pdf.Ln(5)
pdf.SetFont("Helvetica", "B", 14)
pdf.Cell(0, 8, "Expense Details")
pdf.Ln(12)

if len(data.ExpenseItems) == 0 {
pdf.SetFont("Helvetica", "I", 10)
pdf.Cell(0, 6, "No expense transactions in this period")
pdf.Ln(8)
} else {
s.drawTransactionTable(pdf, data.ExpenseItems)
}

pdf.SetY(-15)
pdf.SetFont("Helvetica", "I", 8)
pdf.Cell(0, 10, fmt.Sprintf("Generated on %s by Expense Tracker", time.Now().Format("2006-01-02 15:04:05")))

return pdf.OutputFileAndClose(destPath)
}

func (s *ReportService) drawTransactionTable(pdf *gofpdf.Fpdf, items []ReportItem) {
pdf.SetFillColor(50, 50, 50)
pdf.SetTextColor(255, 255, 255)
pdf.SetFont("Helvetica", "B", 10)
pdf.CellFormat(25, 7, "Date", "1", 0, "L", true, 0, "")
pdf.CellFormat(70, 7, "Description", "1", 0, "L", true, 0, "")
pdf.CellFormat(45, 7, "Category", "1", 0, "L", true, 0, "")
pdf.CellFormat(30, 7, "Amount (GHS)", "1", 0, "R", true, 0, "")
pdf.Ln(7)

pdf.SetTextColor(0, 0, 0)
pdf.SetFont("Helvetica", "", 9)
fill := false
for _, item := range items {
if fill {
pdf.SetFillColor(245, 245, 245)
} else {
pdf.SetFillColor(255, 255, 255)
}

pdf.CellFormat(25, 6, item.Date, "1", 0, "L", fill, 0, "")
pdf.CellFormat(70, 6, item.Description, "1", 0, "L", fill, 0, "")
pdf.CellFormat(45, 6, item.Category, "1", 0, "L", fill, 0, "")
pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", item.Amount), "1", 0, "R", fill, 0, "")
pdf.Ln(6)
fill = !fill
}
pdf.Ln(5)
}
