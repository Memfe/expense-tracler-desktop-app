-- name: CreateTransaction :exec
INSERT INTO transactions (category_id, description,
    amount)
VALUES(?, ?, ?);

-- name: EditTransaction :exec
UPDATE transactions
SET description = ?,
    amount = ?
WHERE id = ?;

-- name: GetAllTransactions :many
SELECT t.id, t.category_id, t.description,
t.amount, t.transaction_date,
c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE   t.description LIKE '%' || CAST(sqlc.arg(search) AS TEXT) || '%'
    OR c.name LIKE '%' || CAST(sqlc.arg(search) AS TEXT) || '%'
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT ? OFFSET ?;

-- name: CountTransactions :one
SELECT COUNT(*) FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE   t.description LIKE '%' || CAST(sqlc.arg(search) AS TEXT) || '%'
    OR c.name LIKE '%' || CAST(sqlc.arg(search) AS TEXT) || '%';

-- name: GetTransactionByID :one
SELECT t.id, t.category_id, t.description,
    t.amount, t.transaction_date,
    c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE t.id = ?;

-- name: GetTransactionByDateRange :many
SELECT t.id, t.category_id, t.description,
    t.amount, t.transaction_date,
    c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE t.transaction_date >= ?
AND t.transaction_date < ? 
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT ? OFFSET ?;

-- name: GetTransactionsByCategoryType :many
SELECT t.id, t.category_id, t.description,
    t.amount, t.transaction_date,
    c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE c.type = ?
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT ? OFFSET ?;

-- name: GetTransactionsByCategoryID :many
SELECT t.id, t.category_id, t.description,
    t.amount, t.transaction_date,
    c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE t.category_id = ?
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT ? OFFSET ?;

-- name: GetTotalCategoryTypeAmountByDateRange :one
SELECT COALESCE(SUM(t.amount),0) FROM transactions t
JOIN categories c ON t.category_id = c.id 
WHERE c.type = ?
AND t.transaction_date >=?
AND t.transaction_date < ?;

-- name: GetTotalCategoryIDAmountByDateRange :one
SELECT COALESCE(SUM(t.amount),0) FROM transactions t
JOIN categories c ON t.category_id = c.id 
WHERE c.id = ?
AND t.transaction_date >=?
AND t.transaction_date < ?;