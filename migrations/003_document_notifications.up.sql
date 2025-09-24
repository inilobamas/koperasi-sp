-- Document notifications table for admin approval system
CREATE TABLE IF NOT EXISTS document_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_document_notifications_user_id ON document_notifications(user_id);
CREATE INDEX idx_document_notifications_read ON document_notifications(read);
CREATE INDEX idx_document_notifications_created_at ON document_notifications(created_at);