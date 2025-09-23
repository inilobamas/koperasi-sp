# Koperasi App API Documentation

## Overview

This document describes the internal API endpoints available in the Koperasi App. All APIs are called through Wails bindings and return a standardized `APIResponse` structure.

## Response Format

All API endpoints return the following structure:

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
}
```

## Customer Management

### CreateCustomer
Creates a new customer with validation and encryption of PII data.

**Request:**
```go
type CustomerCreateRequest struct {
    NIK             string    `json:"nik"`              // 16-digit Indonesian NIK
    Name            string    `json:"name"`
    Email           string    `json:"email"`
    Phone           string    `json:"phone"`            // Indonesian phone format
    DateOfBirth     time.Time `json:"date_of_birth"`
    Address         string    `json:"address"`
    City            string    `json:"city"`
    Province        string    `json:"province"`
    PostalCode      string    `json:"postal_code"`
    Occupation      string    `json:"occupation"`
    MonthlyIncome   int64     `json:"monthly_income"`
    ReferralCode    string    `json:"referral_code"`    // Optional
}
```

**Validation:**
- NIK: Must be exactly 16 digits with valid birth date
- Phone: Must be valid Indonesian format (08xx, +62xx, etc.)
- Email: Standard email validation
- All sensitive data (NIK, email, phone) is encrypted before storage

### GetCustomer(id string)
Retrieves a customer by ID with decrypted PII data.

### UpdateCustomer(id string, req CustomerUpdateRequest)
Updates customer information. Cannot change NIK.

### ListCustomers(req CustomerListRequest)
Lists customers with pagination, search, and filtering. PII data is masked in list view.

**Request:**
```go
type CustomerListRequest struct {
    Page     int    `json:"page"`      // Default: 1
    Limit    int    `json:"limit"`     // Default: 20, Max: 100
    Search   string `json:"search"`    // Searches name, address, city
    Status   string `json:"status"`    // active, pending, inactive, blocked
    Verified *bool  `json:"verified"`  // KTP verification status
}
```

### DeleteCustomer(id string)
Soft deletes a customer (cascade deletes related records).

## Referral Code Management

### CreateReferralCode(req ReferralCodeCreateRequest)
Creates a new referral code with unique code generation.

**Request:**
```go
type ReferralCodeCreateRequest struct {
    OwnerUserID string     `json:"owner_user_id"`
    Quota       int        `json:"quota"`
    ExpiresAt   *time.Time `json:"expires_at"`  // Optional
}
```

### ValidateReferralCode(code string)
Validates if a referral code is active and has available quota.

### ListReferralCodes(req ReferralCodeListRequest)
Lists referral codes with filtering by owner and status.

## Document Management

### ListDocuments(req DocumentListRequest)
Lists documents with filtering by customer, type, and status.

### GetDocument(id string)
Retrieves document metadata.

### VerifyDocument(req DocumentVerifyRequest)
Verifies or rejects a document (admin/karyawan only).

**Request:**
```go
type DocumentVerifyRequest struct {
    DocumentID string `json:"document_id"`
    VerifierID string `json:"verifier_id"`
    Status     string `json:"status"`    // verified, rejected
    Notes      string `json:"notes"`
}
```

### GetDocumentFile(id string)
Returns the file path for document viewing.

### GetPendingDocuments()
Returns all documents pending verification.

## Loan Management

### CreateLoan(req LoanCreateRequest)
Creates a new loan application.

**Request:**
```go
type LoanCreateRequest struct {
    CustomerID   string  `json:"customer_id"`
    Amount       int64   `json:"amount"`
    InterestRate float64 `json:"interest_rate"`
    Term         int     `json:"term"`  // months
}
```

**Business Rules:**
- Customers can only have one active loan
- Monthly payment calculated using PMT formula
- Contract number auto-generated (KOP-YYYY-NNNN format)

### DisburseLoan(id string)
Disburses an approved loan and creates installment schedule.

### PayInstallment(req InstallmentPaymentRequest)
Records an installment payment.

**Request:**
```go
type InstallmentPaymentRequest struct {
    InstallmentID string    `json:"installment_id"`
    Amount        int64     `json:"amount"`
    PaymentDate   time.Time `json:"payment_date"`
}
```

### GetOverdueInstallments()
Returns all overdue installments with calculated DPD.

## Notification System

### SendNotification(req SendNotificationRequest)
Sends a notification using templates.

**Request:**
```go
type SendNotificationRequest struct {
    InstallmentID string              `json:"installment_id"`
    TemplateID    string              `json:"template_id"`
    Type          NotificationType    `json:"type"`      // email, whatsapp
    Recipient     string              `json:"recipient"`
    ScheduledFor  time.Time           `json:"scheduled_for"`
}
```

### TestNotification(req NotificationTestRequest)
Sends a test notification.

**Rate Limiting:**
- WhatsApp: Maximum 1 message per 24 hours per contract

**Template Variables:**
- `{{.nama}}` - Customer name
- `{{.no_kontrak}}` - Contract number
- `{{.jatuh_tempo}}` - Due date
- `{{.jumlah}}` - Amount (formatted currency)
- `{{.link_pembayaran}}` - Payment link
- `{{.kontak_cs}}` - Customer service contact

### GetPendingNotifications()
Returns notifications scheduled for processing.

## Scheduler Management

### GetSchedulerStatus()
Returns scheduler status and next run times.

### TriggerReminderNotifications()
Manually triggers reminder notification processing.

### TriggerPendingNotifications()
Manually processes pending notifications.

**Schedule:**
- Reminder processing: Daily at 09:00 WIB
- Pending notifications: Every 5 minutes
- DPD updates: Every hour

## Audit System

### LogAuditAction(req AuditLogRequest)
Logs an audit action.

**Request:**
```go
type AuditLogRequest struct {
    UserID    *string     `json:"user_id"`
    Action    string      `json:"action"`     // create, update, delete, verify, etc.
    Entity    string      `json:"entity"`     // customer, loan, document, etc.
    EntityID  string      `json:"entity_id"`
    Before    interface{} `json:"before"`     // Previous state
    After     interface{} `json:"after"`      // New state
    IPAddress string      `json:"ip_address"`
    UserAgent string      `json:"user_agent"`
}
```

### ListAuditLogs(req AuditLogListRequest)
Lists audit logs with filtering.

### GetAuditSummary(entityID string)
Returns audit summary for a specific entity.

## Configuration

### GetConfig()
Returns current application configuration.

### UpdateConfig(configData string)
Updates application configuration.

**Configuration Sections:**
- Database: SQLite path
- SMTP: Email server settings
- WhatsApp: Meta Cloud API settings
- Storage: Document storage path
- Security: Encryption settings

## Utility Functions

### SeedDatabase()
Populates database with dummy data for testing.

### HealthCheck()
Returns application health status.

## Security Features

### Data Encryption
- NIK, email, and phone numbers are encrypted using `filippo.io/age`
- Encryption key stored in configuration
- Data is masked in UI (NIK: `************1234`)

### Validation
- NIK: 16-digit format with birth date validation
- Phone: Indonesian operator prefixes validation
- Email: Standard format validation

### Audit Trail
- All CRUD operations are logged
- User actions tracked with IP and user agent
- Before/after states captured for updates

## Error Handling

All APIs return errors in the `message` field when `success` is `false`. Common error scenarios:

- **Validation errors**: Invalid data format or business rules
- **Not found**: Entity doesn't exist
- **Duplicate**: Unique constraint violation (NIK, phone)
- **Business logic**: Loan limits, rate limiting, etc.
- **System errors**: Database, encryption, or external service failures

## Database Schema

### Tables
- `users` - System users with roles
- `customers` - Customer data (PII encrypted)
- `referral_codes` - Referral codes with usage tracking
- `documents` - Document metadata and verification status
- `loans` - Loan applications and status
- `loan_installments` - Installment schedule and payments
- `notification_templates` - Message templates
- `notification_logs` - Notification sending history
- `audit_logs` - Complete audit trail

### Indexes
- Performance indexes on frequently queried fields
- Unique constraints on NIK, phone, referral codes
- Compound indexes for complex queries

## Development Notes

### Testing
- Basic validation and encryption tests included
- Use `go test ./test/` to run tests
- Mock providers available for offline testing

### Building
- Use `wails dev` for development
- Use `wails build` for production builds
- Supports Windows, macOS, and Linux

### Configuration
- Default config created at `~/.koperasi/config.json`
- Database and documents stored in `~/.koperasi/`
- Timezone set to Asia/Jakarta for scheduling