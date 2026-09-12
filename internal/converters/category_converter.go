package converters

import (
	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/models"
)

func ToCategoryResponse(cat sqlc.Category) models.CategoryResponse {
	return models.CategoryResponse{
		ID:        cat.ID,
		Name:      cat.Name,
		Type:      cat.Type,
		CreatedAt: cat.CreatedAt,
	}
}

func ToCategoryResponses(cats []sqlc.Category) []models.CategoryResponse {
	categories := make([]models.CategoryResponse, 0, len(cats))

	for _, category := range cats {
		categories = append(categories, ToCategoryResponse(category))
	}
	return categories
}
