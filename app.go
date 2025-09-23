package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
	"koperasi-app/internal/scheduler"
	"koperasi-app/internal/services"
)

// App struct
type App struct {
	ctx                 context.Context
	db                  *database.DB
	config              *config.Config
	customerService     *services.CustomerService
	referralService     *services.ReferralService
	documentService     *services.DocumentService
	loanService         *services.LoanService
	notificationService *services.NotificationService
	auditService        *services.AuditService
	scheduler           *scheduler.Scheduler
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	a.config = cfg

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	a.db = db

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize services
	a.customerService = services.NewCustomerService(db)
	a.referralService = services.NewReferralService(db)
	a.documentService = services.NewDocumentService(db, cfg)
	a.loanService = services.NewLoanService(db)
	a.notificationService = services.NewNotificationService(db, cfg)
	a.auditService = services.NewAuditService(db)

	// Initialize scheduler
	a.scheduler = scheduler.NewScheduler(db, cfg, a.notificationService, a.loanService)
	if err := a.scheduler.Start(); err != nil {
		log.Printf("Failed to start scheduler: %v", err)
	}

	log.Println("Application initialized successfully")
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, Welcome to Koperasi App!", name)
}

// Customer Management APIs
func (a *App) CreateCustomer(req services.CustomerCreateRequest) (*services.APIResponse, error) {
	customer, err := a.customerService.CreateCustomer(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Customer created successfully",
		Data:    customer,
	}, nil
}

func (a *App) GetCustomer(id string) (*services.APIResponse, error) {
	customer, err := a.customerService.GetCustomer(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    customer,
	}, nil
}

func (a *App) UpdateCustomer(id string, req services.CustomerUpdateRequest) (*services.APIResponse, error) {
	customer, err := a.customerService.UpdateCustomer(id, req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Customer updated successfully",
		Data:    customer,
	}, nil
}

func (a *App) ListCustomers(req services.CustomerListRequest) (*services.APIResponse, error) {
	response, err := a.customerService.ListCustomers(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    response,
	}, nil
}

func (a *App) DeleteCustomer(id string) (*services.APIResponse, error) {
	err := a.customerService.DeleteCustomer(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Customer deleted successfully",
	}, nil
}

// Referral Code Management APIs
func (a *App) CreateReferralCode(req services.ReferralCodeCreateRequest) (*services.APIResponse, error) {
	referralCode, err := a.referralService.CreateReferralCode(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Referral code created successfully",
		Data:    referralCode,
	}, nil
}

func (a *App) GetReferralCode(id string) (*services.APIResponse, error) {
	referralCode, err := a.referralService.GetReferralCode(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    referralCode,
	}, nil
}

func (a *App) UpdateReferralCode(id string, req services.ReferralCodeUpdateRequest) (*services.APIResponse, error) {
	referralCode, err := a.referralService.UpdateReferralCode(id, req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Referral code updated successfully",
		Data:    referralCode,
	}, nil
}

func (a *App) ListReferralCodes(req services.ReferralCodeListRequest) (*services.APIResponse, error) {
	response, err := a.referralService.ListReferralCodes(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    response,
	}, nil
}

func (a *App) DeleteReferralCode(id string) (*services.APIResponse, error) {
	err := a.referralService.DeleteReferralCode(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Referral code deleted successfully",
	}, nil
}

func (a *App) ValidateReferralCode(code string) (*services.APIResponse, error) {
	referralCode, err := a.referralService.ValidateReferralCode(code)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    referralCode,
	}, nil
}

// Document Management APIs
func (a *App) ListDocuments(req services.DocumentListRequest) (*services.APIResponse, error) {
	response, err := a.documentService.ListDocuments(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    response,
	}, nil
}

func (a *App) GetDocument(id string) (*services.APIResponse, error) {
	document, err := a.documentService.GetDocument(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    document,
	}, nil
}

func (a *App) VerifyDocument(req services.DocumentVerifyRequest) (*services.APIResponse, error) {
	document, err := a.documentService.VerifyDocument(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Document verified successfully",
		Data:    document,
	}, nil
}

func (a *App) DeleteDocument(id string) (*services.APIResponse, error) {
	err := a.documentService.DeleteDocument(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Document deleted successfully",
	}, nil
}

func (a *App) GetDocumentFile(id string) (string, error) {
	return a.documentService.GetDocumentFile(id)
}

func (a *App) GetPendingDocuments() (*services.APIResponse, error) {
	documents, err := a.documentService.GetPendingDocuments()
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    documents,
	}, nil
}

// Configuration APIs
func (a *App) GetConfig() (*services.APIResponse, error) {
	return &services.APIResponse{
		Success: true,
		Data:    a.config,
	}, nil
}

func (a *App) UpdateConfig(configData string) (*services.APIResponse, error) {
	var newConfig config.Config
	if err := json.Unmarshal([]byte(configData), &newConfig); err != nil {
		return &services.APIResponse{
			Success: false,
			Message: "Invalid configuration format",
		}, nil
	}

	if err := newConfig.Save(); err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	a.config = &newConfig

	return &services.APIResponse{
		Success: true,
		Message: "Configuration updated successfully",
	}, nil
}

// Database seeding
func (a *App) SeedDatabase() (*services.APIResponse, error) {
	seeder := database.NewSeeder(a.db)
	if err := seeder.SeedAll(); err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Database seeded successfully",
	}, nil
}

// Health check
func (a *App) HealthCheck() (*services.APIResponse, error) {
	// Check database connection
	if err := a.db.Ping(); err != nil {
		return &services.APIResponse{
			Success: false,
			Message: "Database connection failed",
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Application is healthy",
		Data: map[string]interface{}{
			"timestamp": time.Now(),
			"version":   "1.0.0",
		},
	}, nil
}

// Loan Management APIs
func (a *App) CreateLoan(req services.LoanCreateRequest) (*services.APIResponse, error) {
	loan, err := a.loanService.CreateLoan(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Loan created successfully",
		Data:    loan,
	}, nil
}

func (a *App) GetLoan(id string) (*services.APIResponse, error) {
	loan, err := a.loanService.GetLoan(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    loan,
	}, nil
}

func (a *App) UpdateLoan(id string, req services.LoanUpdateRequest) (*services.APIResponse, error) {
	loan, err := a.loanService.UpdateLoan(id, req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Loan updated successfully",
		Data:    loan,
	}, nil
}

func (a *App) ListLoans(req services.LoanListRequest) (*services.APIResponse, error) {
	response, err := a.loanService.ListLoans(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    response,
	}, nil
}

func (a *App) DisburseLoan(id string) (*services.APIResponse, error) {
	loan, err := a.loanService.DisburseLoan(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Loan disbursed successfully",
		Data:    loan,
	}, nil
}

func (a *App) PayInstallment(req services.InstallmentPaymentRequest) (*services.APIResponse, error) {
	installment, err := a.loanService.PayInstallment(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Payment processed successfully",
		Data:    installment,
	}, nil
}

func (a *App) GetOverdueInstallments() (*services.APIResponse, error) {
	installments, err := a.loanService.GetOverdueInstallments()
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    installments,
	}, nil
}

// Notification APIs
func (a *App) TestNotification(req services.NotificationTestRequest) (*services.APIResponse, error) {
	err := a.notificationService.TestNotification(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Test notification sent successfully",
	}, nil
}

func (a *App) SendNotification(req services.SendNotificationRequest) (*services.APIResponse, error) {
	notification, err := a.notificationService.SendNotification(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Notification sent successfully",
		Data:    notification,
	}, nil
}

func (a *App) GetPendingNotifications() (*services.APIResponse, error) {
	notifications, err := a.notificationService.GetPendingNotifications()
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    notifications,
	}, nil
}

// Scheduler APIs
func (a *App) GetSchedulerStatus() (*services.APIResponse, error) {
	status := a.scheduler.GetStatus()
	return &services.APIResponse{
		Success: true,
		Data:    status,
	}, nil
}

func (a *App) TriggerReminderNotifications() (*services.APIResponse, error) {
	err := a.scheduler.TriggerReminderNotifications()
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Reminder notifications triggered successfully",
	}, nil
}

func (a *App) TriggerPendingNotifications() (*services.APIResponse, error) {
	err := a.scheduler.TriggerPendingNotifications()
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Pending notifications processed successfully",
	}, nil
}

// Audit APIs
func (a *App) LogAuditAction(req services.AuditLogRequest) (*services.APIResponse, error) {
	auditLog, err := a.auditService.LogAction(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Message: "Audit action logged successfully",
		Data:    auditLog,
	}, nil
}

func (a *App) GetAuditLog(id string) (*services.APIResponse, error) {
	auditLog, err := a.auditService.GetAuditLog(id)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    auditLog,
	}, nil
}

func (a *App) ListAuditLogs(req services.AuditLogListRequest) (*services.APIResponse, error) {
	response, err := a.auditService.ListAuditLogs(req)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    response,
	}, nil
}

func (a *App) GetAuditSummary(entityID string) (*services.APIResponse, error) {
	summary, err := a.auditService.GetAuditSummary(entityID)
	if err != nil {
		return &services.APIResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &services.APIResponse{
		Success: true,
		Data:    summary,
	}, nil
}
