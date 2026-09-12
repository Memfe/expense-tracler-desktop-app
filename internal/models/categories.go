package models

type CreateCategoryRequest struct {
	Name string `json:"name" validate:"required,min=2"`
	Type string `json:"type" validate:"required"`
}

type EditCategoryRequest struct {
	Name string `json:"name" validate:"required,min=2"`
	Type string `json:"type" validate:"required"`
	ID   int64  `json:"id" validate:"required,gt=0"`
}

type CategoryResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	CreatedAt string `json:"created_at"`
}
