-- Drop user sessions table
DROP TABLE IF EXISTS user_sessions;

-- Remove password hash column from users table
-- Note: SQLite doesn't support DROP COLUMN, so we would need to recreate the table
-- For now, we'll leave the column but this should be handled in a real migration system