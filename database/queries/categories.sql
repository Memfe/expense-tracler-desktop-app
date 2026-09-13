-- name: CreateCategory :exec
INSERT INTO categories(name, type)
VALUES (?, ?);

-- name: EditCategory :exec
UPDATE categories SET name = ?,
type = ? WHERE id = ?;

-- name: GetAllCategories :many
SELECT * FROM categories;
