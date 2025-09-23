-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'karyawan')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Referral codes table
CREATE TABLE referral_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    owner_user_id TEXT NOT NULL,
    quota INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Customers table with encrypted sensitive fields
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    nik TEXT UNIQUE NOT NULL, -- Encrypted
    name TEXT NOT NULL,
    email TEXT, -- Encrypted
    phone TEXT, -- Encrypted
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    occupation TEXT NOT NULL,
    monthly_income INTEGER NOT NULL,
    referral_code_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'blocked')),
    ktp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ktp')),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_by TEXT,
    verified_at DATETIME,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Loans table
CREATE TABLE loans (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    contract_number TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    interest_rate REAL NOT NULL,
    term INTEGER NOT NULL, -- in months
    monthly_payment INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted', 'cancelled')),
    disbursed_at DATETIME,
    due_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Loan installments table
CREATE TABLE loan_installments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    paid_at DATETIME,
    dpd INTEGER NOT NULL DEFAULT 0, -- Days Past Due
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    UNIQUE(loan_id, number)
);

-- Notification templates table
CREATE TABLE notification_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('before_d7', 'before_d3', 'before_d1', 'after_d1', 'after_d3', 'after_d7')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification logs table
CREATE TABLE notification_logs (
    id TEXT PRIMARY KEY,
    installment_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    sent_at DATETIME,
    scheduled_for DATETIME NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at DATETIME,
    error_message TEXT,
    external_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (installment_id) REFERENCES loan_installments(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before TEXT,
    after TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_customers_nik ON customers(nik);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_owner_user_id ON referral_codes(owner_user_id);
CREATE INDEX idx_loan_installments_due_date ON loan_installments(due_date);
CREATE INDEX idx_loan_installments_status ON loan_installments(status);
CREATE INDEX idx_notification_logs_scheduled_for ON notification_logs(scheduled_for);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_users_updated_at 
    AFTER UPDATE ON users 
    BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_referral_codes_updated_at 
    AFTER UPDATE ON referral_codes 
    BEGIN 
        UPDATE referral_codes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_customers_updated_at 
    AFTER UPDATE ON customers 
    BEGIN 
        UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_documents_updated_at 
    AFTER UPDATE ON documents 
    BEGIN 
        UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_loans_updated_at 
    AFTER UPDATE ON loans 
    BEGIN 
        UPDATE loans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_loan_installments_updated_at 
    AFTER UPDATE ON loan_installments 
    BEGIN 
        UPDATE loan_installments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_notification_templates_updated_at 
    AFTER UPDATE ON notification_templates 
    BEGIN 
        UPDATE notification_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER trigger_notification_logs_updated_at 
    AFTER UPDATE ON notification_logs 
    BEGIN 
        UPDATE notification_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;