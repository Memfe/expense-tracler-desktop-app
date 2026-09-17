-- name: CreateCategory :exec
INSERT INTO categories(name, type)
VALUES (?, ?);

-- name: EditCategory :exec
UPDATE categories SET name = ?,
type = ? WHERE id = ?;

-- name: GetAllCategories :many
SELECT * FROM categories;

-- name: CountCategoryTransactions :one
SELECT COUNT(*) FROM transactions WHERE category_id = ?;

-- name: DeleteUnusedCategory :execrows
DELETE FROM categories
WHERE categories.id = ?
AND NOT EXISTS (SELECT 1 FROM transactions WHERE transactions.category_id = ?);

