-- Drop all triggers
DROP TRIGGER IF EXISTS trigger_notification_logs_updated_at;
DROP TRIGGER IF EXISTS trigger_notification_templates_updated_at;
DROP TRIGGER IF EXISTS trigger_loan_installments_updated_at;
DROP TRIGGER IF EXISTS trigger_loans_updated_at;
DROP TRIGGER IF EXISTS trigger_documents_updated_at;
DROP TRIGGER IF EXISTS trigger_customers_updated_at;
DROP TRIGGER IF EXISTS trigger_referral_codes_updated_at;
DROP TRIGGER IF EXISTS trigger_users_updated_at;

-- Drop all indexes
DROP INDEX IF EXISTS idx_audit_logs_entity_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_notification_logs_status;
DROP INDEX IF EXISTS idx_notification_logs_scheduled_for;
DROP INDEX IF EXISTS idx_loan_installments_status;
DROP INDEX IF EXISTS idx_loan_installments_due_date;
DROP INDEX IF EXISTS idx_referral_codes_owner_user_id;
DROP INDEX IF EXISTS idx_referral_codes_code;
DROP INDEX IF EXISTS idx_customers_phone;
DROP INDEX IF EXISTS idx_customers_nik;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notification_logs;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS users;