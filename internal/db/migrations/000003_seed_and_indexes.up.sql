CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_description
ON transactions(description);

-- Seed default categories for fresh installations (INSERT OR IGNORE ensures
-- this is safe to run on existing databases without creating duplicates).
INSERT OR IGNORE INTO categories (name, type) VALUES ('School fees', 'income');
INSERT OR IGNORE INTO categories (name, type) VALUES ('Utilities', 'expense');
