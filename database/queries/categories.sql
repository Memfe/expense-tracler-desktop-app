-- name: CreateCategory :one
INSERT INTO categories(name, type)
VALUES (?, ?) RETURNING *;

-- name: EditCategory :exec
UPDATE categories SET name = ?,
type = ? WHERE id = ?;

-- name: GetAllCategories :many
SELECT * FROM categories;
