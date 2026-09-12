package services

import (
	"context"
	"errors"
	"expense_tracker/internal/converters"
	"expense_tracker/internal/db/sqlc"
	"expense_tracker/internal/models"
	"expense_tracker/internal/utils"
	"fmt"
)

type CategoryService struct {
	queries *sqlc.Queries
}

func NewCategoryService(q *sqlc.Queries) *CategoryService {
	return &CategoryService{
		queries: q,
	}
}

func (c *CategoryService) CreateCategory(ctx context.Context, req models.CreateCategoryRequest) (models.CategoryResponse, error) {
	if err := utils.Validator.Struct(req); err != nil {
		return models.CategoryResponse{}, errors.New(utils.ValidationMessage(err))
	}

	params := sqlc.CreateCategoryParams{
		Name: req.Name,
		Type: req.Type,
	}

	category, err := c.queries.CreateCategory(ctx, params)
	if err != nil {
		return models.CategoryResponse{}, fmt.Errorf("failed to create category: %w", err)
	}
	return converters.ToCategoryResponse(category), nil
}

func (c *CategoryService) EditCategory(ctx context.Context, req models.EditCategoryRequest) error {
	if err := utils.Validator.Struct(req); err != nil {
		return errors.New(utils.ValidationMessage(err))
	}

	params := sqlc.EditCategoryParams{
		Name: req.Name,
		Type: req.Type,
		ID:   req.ID,
	}
	err := c.queries.EditCategory(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to edit category: %w", err)
	}
	return nil
}

func (c *CategoryService) GetAllCategories(ctx context.Context) ([]models.CategoryResponse, error) {
	categories, err := c.queries.GetAllCategories(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch categories: %w", err)
	}
	return converters.ToCategoryResponses(categories), nil
}
