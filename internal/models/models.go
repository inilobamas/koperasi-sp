package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Name      string    `json:"name" db:"name"`
	Role      UserRole  `json:"role" db:"role"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type UserRole string

const (
	RoleSuperadmin UserRole = "superadmin"
	RoleAdmin      UserRole = "admin"
	RoleKaryawan   UserRole = "karyawan"
)

type Customer struct {
	ID              uuid.UUID         `json:"id" db:"id"`
	NIK             string            `json:"nik" db:"nik"`
	Name            string            `json:"name" db:"name"`
	Email           string            `json:"email" db:"email"`
	Phone           string            `json:"phone" db:"phone"`
	DateOfBirth     time.Time         `json:"date_of_birth" db:"date_of_birth"`
	Address         string            `json:"address" db:"address"`
	City            string            `json:"city" db:"city"`
	Province        string            `json:"province" db:"province"`
	PostalCode      string            `json:"postal_code" db:"postal_code"`
	Occupation      string            `json:"occupation" db:"occupation"`
	MonthlyIncome   int64             `json:"monthly_income" db:"monthly_income"`
	ReferralCodeID  *uuid.UUID        `json:"referral_code_id" db:"referral_code_id"`
	Status          CustomerStatus    `json:"status" db:"status"`
	KTPVerified     bool              `json:"ktp_verified" db:"ktp_verified"`
	CreatedAt       time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at" db:"updated_at"`
	ReferralCode    *ReferralCode     `json:"referral_code,omitempty"`
	Documents       []Document        `json:"documents,omitempty"`
	Loans           []Loan            `json:"loans,omitempty"`
}

type CustomerStatus string

const (
	CustomerStatusPending  CustomerStatus = "pending"
	CustomerStatusActive   CustomerStatus = "active"
	CustomerStatusInactive CustomerStatus = "inactive"
	CustomerStatusBlocked  CustomerStatus = "blocked"
)

type ReferralCode struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Code        string     `json:"code" db:"code"`
	OwnerUserID uuid.UUID  `json:"owner_user_id" db:"owner_user_id"`
	Quota       int        `json:"quota" db:"quota"`
	Used        int        `json:"used" db:"used"`
	Active      bool       `json:"active" db:"active"`
	ExpiresAt   *time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	OwnerUser   *User      `json:"owner_user,omitempty"`
	Customers   []Customer `json:"customers,omitempty"`
}

type Document struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	CustomerID   uuid.UUID      `json:"customer_id" db:"customer_id"`
	Type         DocumentType   `json:"type" db:"type"`
	Filename     string         `json:"filename" db:"filename"`
	OriginalName string         `json:"original_name" db:"original_name"`
	Path         string         `json:"path" db:"path"`
	Size         int64          `json:"size" db:"size"`
	MimeType     string         `json:"mime_type" db:"mime_type"`
	Status       DocumentStatus `json:"status" db:"status"`
	VerifiedBy   *uuid.UUID     `json:"verified_by" db:"verified_by"`
	VerifiedAt   *time.Time     `json:"verified_at" db:"verified_at"`
	Notes        string         `json:"notes" db:"notes"`
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at" db:"updated_at"`
	Customer     *Customer      `json:"customer,omitempty"`
	VerifierUser *User          `json:"verifier_user,omitempty"`
}

type DocumentType string

const (
	DocumentTypeKTP DocumentType = "ktp"
)

type DocumentStatus string

const (
	DocumentStatusPending  DocumentStatus = "pending"
	DocumentStatusVerified DocumentStatus = "verified"
	DocumentStatusRejected DocumentStatus = "rejected"
)

type Loan struct {
	ID                uuid.UUID         `json:"id" db:"id"`
	CustomerID        uuid.UUID         `json:"customer_id" db:"customer_id"`
	ContractNumber    string            `json:"contract_number" db:"contract_number"`
	Amount            int64             `json:"amount" db:"amount"`
	InterestRate      float64           `json:"interest_rate" db:"interest_rate"`
	Term              int               `json:"term" db:"term"`
	MonthlyPayment    int64             `json:"monthly_payment" db:"monthly_payment"`
	Status            LoanStatus        `json:"status" db:"status"`
	DisbursedAt       *time.Time        `json:"disbursed_at" db:"disbursed_at"`
	DueDate           time.Time         `json:"due_date" db:"due_date"`
	CreatedAt         time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at" db:"updated_at"`
	Customer          *Customer         `json:"customer,omitempty"`
	Installments      []LoanInstallment `json:"installments,omitempty"`
}

type LoanStatus string

const (
	LoanStatusPending    LoanStatus = "pending"
	LoanStatusApproved   LoanStatus = "approved"
	LoanStatusDisbursed  LoanStatus = "disbursed"
	LoanStatusActive     LoanStatus = "active"
	LoanStatusCompleted  LoanStatus = "completed"
	LoanStatusDefaulted  LoanStatus = "defaulted"
	LoanStatusCancelled  LoanStatus = "cancelled"
)

type LoanInstallment struct {
	ID         uuid.UUID               `json:"id" db:"id"`
	LoanID     uuid.UUID               `json:"loan_id" db:"loan_id"`
	Number     int                     `json:"number" db:"number"`
	DueDate    time.Time               `json:"due_date" db:"due_date"`
	AmountDue  int64                   `json:"amount_due" db:"amount_due"`
	AmountPaid int64                   `json:"amount_paid" db:"amount_paid"`
	Status     LoanInstallmentStatus   `json:"status" db:"status"`
	PaidAt     *time.Time              `json:"paid_at" db:"paid_at"`
	DPD        int                     `json:"dpd" db:"dpd"`
	CreatedAt  time.Time               `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time               `json:"updated_at" db:"updated_at"`
	Loan       *Loan                   `json:"loan,omitempty"`
	Notifications []NotificationLog    `json:"notifications,omitempty"`
}

type LoanInstallmentStatus string

const (
	InstallmentStatusPending   LoanInstallmentStatus = "pending"
	InstallmentStatusPaid      LoanInstallmentStatus = "paid"
	InstallmentStatusOverdue   LoanInstallmentStatus = "overdue"
	InstallmentStatusPartial   LoanInstallmentStatus = "partial"
)

type NotificationTemplate struct {
	ID           uuid.UUID             `json:"id" db:"id"`
	Name         string                `json:"name" db:"name"`
	Type         NotificationType      `json:"type" db:"type"`
	Subject      string                `json:"subject" db:"subject"`
	Body         string                `json:"body" db:"body"`
	ScheduleType NotificationSchedule  `json:"schedule_type" db:"schedule_type"`
	Active       bool                  `json:"active" db:"active"`
	CreatedAt    time.Time             `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at" db:"updated_at"`
}

type NotificationType string

const (
	NotificationTypeEmail    NotificationType = "email"
	NotificationTypeWhatsApp NotificationType = "whatsapp"
)

type NotificationSchedule string

const (
	ScheduleBeforeD7  NotificationSchedule = "before_d7"
	ScheduleBeforeD3  NotificationSchedule = "before_d3"
	ScheduleBeforeD1  NotificationSchedule = "before_d1"
	ScheduleAfterD1   NotificationSchedule = "after_d1"
	ScheduleAfterD3   NotificationSchedule = "after_d3"
	ScheduleAfterD7   NotificationSchedule = "after_d7"
)

type NotificationLog struct {
	ID             uuid.UUID             `json:"id" db:"id"`
	InstallmentID  uuid.UUID             `json:"installment_id" db:"installment_id"`
	TemplateID     uuid.UUID             `json:"template_id" db:"template_id"`
	Type           NotificationType      `json:"type" db:"type"`
	Recipient      string                `json:"recipient" db:"recipient"`
	Subject        string                `json:"subject" db:"subject"`
	Body           string                `json:"body" db:"body"`
	Status         NotificationStatus    `json:"status" db:"status"`
	SentAt         *time.Time            `json:"sent_at" db:"sent_at"`
	ScheduledFor   time.Time             `json:"scheduled_for" db:"scheduled_for"`
	Attempts       int                   `json:"attempts" db:"attempts"`
	LastAttemptAt  *time.Time            `json:"last_attempt_at" db:"last_attempt_at"`
	ErrorMessage   string                `json:"error_message" db:"error_message"`
	ExternalID     string                `json:"external_id" db:"external_id"`
	CreatedAt      time.Time             `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at" db:"updated_at"`
	Installment    *LoanInstallment      `json:"installment,omitempty"`
	Template       *NotificationTemplate `json:"template,omitempty"`
}

type NotificationStatus string

const (
	NotificationStatusPending NotificationStatus = "pending"
	NotificationStatusSent    NotificationStatus = "sent"
	NotificationStatusFailed  NotificationStatus = "failed"
	NotificationStatusSkipped NotificationStatus = "skipped"
)

type AuditLog struct {
	ID        uuid.UUID   `json:"id" db:"id"`
	UserID    *uuid.UUID  `json:"user_id" db:"user_id"`
	Action    string      `json:"action" db:"action"`
	Entity    string      `json:"entity" db:"entity"`
	EntityID  string      `json:"entity_id" db:"entity_id"`
	Before    string      `json:"before" db:"before"`
	After     string      `json:"after" db:"after"`
	IPAddress string      `json:"ip_address" db:"ip_address"`
	UserAgent string      `json:"user_agent" db:"user_agent"`
	CreatedAt time.Time   `json:"created_at" db:"created_at"`
	User      *User       `json:"user,omitempty"`
}