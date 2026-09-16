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

-- name: CountTransactionsByDateRange :one
SELECT COUNT(*)
FROM transactions
WHERE transaction_date >= ?
AND transaction_date < ?;

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

-- name: CountTransactionsByCategoryType :one
SELECT COUNT(*)
FROM transactions
JOIN categories c ON transactions.category_id = c.id
WHERE c.type = ?;

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

-- name: CountTransactionsByCategoryID :one
SELECT COUNT(*)
FROM transactions
WHERE category_id = ?;

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

-- name: GetCategoryBreakdownByDateRange :many
SELECT c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    CAST(COALESCE(SUM(t.amount), 0) AS INTEGER) AS total,
    COUNT(t.id) AS transaction_count
FROM categories c
LEFT JOIN transactions t
    ON t.category_id = c.id
    AND t.transaction_date >= ?
    AND t.transaction_date < ?
GROUP BY c.id, c.name, c.type
ORDER BY c.type ASC, total DESC;