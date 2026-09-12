PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL UNIQUE,
    type VARCHAR NOT NULL 
        CHECK (type IN ('income', 'expenses')),
    created_at TEXT NOT NULL DEFAULT(datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    transaction_date TEXT NOT NULL DEFAULT(datetime('now')),

    FOREIGN KEY(category_id)REFERENCES categories(id)
);

CREATE INDEX idx_transactions_category_id
ON transactions(category_id);