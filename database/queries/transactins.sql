-- name: CreateTransaction :one
INSERT INTO transactions (category_id, description,
    amount)
VALUES(?, ?, ?)
RETURNING *;

-- name: UpdateTransaction :one
UPDATE transactions
SET description = ?,
    amount = ?
WHERE id = ?
RETURNING *;

-- name: GetAllTransactions :many
SELECT t.id, t.category_id, t.description,
t.amount, t.transaction_date,
c.name AS category_name, c.type AS category_type
FROM transactions t 
JOIN categories c 
ON t.category_id = c.id
WHERE   t.description LIKE '%' || ? || '%'
    OR c.name LIKE '%' || ? || '%'
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT ? OFFSET ?;

-- name: CountTransactions :one
SELECT COUNT(*) FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE   t.description LIKE '%' || ? || '%'
    OR c.name LIKE '%' || ? || '%';

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
ORDER BY t.transaction_date DESC, t.id DESC;

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