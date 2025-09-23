package scheduler

import (
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
	"koperasi-app/internal/services"
	"koperasi-app/internal/utils"
)

type Scheduler struct {
	cron              *cron.Cron
	db                *database.DB
	cfg               *config.Config
	notificationSvc   *services.NotificationService
	loanSvc           *services.LoanService
}

func NewScheduler(db *database.DB, cfg *config.Config, notificationSvc *services.NotificationService, loanSvc *services.LoanService) *Scheduler {
	// Create cron with Asia/Jakarta timezone
	jakartaLocation, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Printf("Failed to load Asia/Jakarta timezone, using UTC: %v", err)
		jakartaLocation = time.UTC
	}

	c := cron.New(cron.WithLocation(jakartaLocation))

	return &Scheduler{
		cron:            c,
		db:              db,
		cfg:             cfg,
		notificationSvc: notificationSvc,
		loanSvc:         loanSvc,
	}
}

func (s *Scheduler) Start() error {
	// Schedule reminder notifications at 09:00 WIB daily
	_, err := s.cron.AddFunc("0 9 * * *", s.processReminderNotifications)
	if err != nil {
		return fmt.Errorf("failed to schedule reminder notifications: %v", err)
	}

	// Schedule pending notification processing every 5 minutes
	_, err = s.cron.AddFunc("*/5 * * * *", s.processPendingNotifications)
	if err != nil {
		return fmt.Errorf("failed to schedule pending notification processing: %v", err)
	}

	// Schedule DPD updates every hour
	_, err = s.cron.AddFunc("0 * * * *", s.updateDaysPastDue)
	if err != nil {
		return fmt.Errorf("failed to schedule DPD updates: %v", err)
	}

	s.cron.Start()
	log.Println("Scheduler started with Asia/Jakarta timezone")
	return nil
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
	log.Println("Scheduler stopped")
}

func (s *Scheduler) processReminderNotifications() {
	log.Println("Processing reminder notifications...")

	today := time.Now()
	
	// Get all active templates
	templates, err := s.getActiveTemplates()
	if err != nil {
		log.Printf("Failed to get active templates: %v", err)
		return
	}

	for _, template := range templates {
		err := s.processTemplateReminders(template, today)
		if err != nil {
			log.Printf("Failed to process template %s: %v", template.Name, err)
		}
	}

	log.Println("Reminder notification processing completed")
}

func (s *Scheduler) processTemplateReminders(template models.NotificationTemplate, today time.Time) error {
	// Calculate target date based on schedule type
	var targetDate time.Time
	var comparison string

	switch template.ScheduleType {
	case models.ScheduleBeforeD7:
		targetDate = today.AddDate(0, 0, 7)
		comparison = "="
	case models.ScheduleBeforeD3:
		targetDate = today.AddDate(0, 0, 3)
		comparison = "="
	case models.ScheduleBeforeD1:
		targetDate = today.AddDate(0, 0, 1)
		comparison = "="
	case models.ScheduleAfterD1:
		targetDate = today.AddDate(0, 0, -1)
		comparison = "="
	case models.ScheduleAfterD3:
		targetDate = today.AddDate(0, 0, -3)
		comparison = "="
	case models.ScheduleAfterD7:
		targetDate = today.AddDate(0, 0, -7)
		comparison = "="
	default:
		return fmt.Errorf("unknown schedule type: %s", template.ScheduleType)
	}

	// Query installments that match the criteria
	query := fmt.Sprintf(`
		SELECT li.id, li.loan_id, li.number, li.due_date, li.amount_due, li.amount_paid, li.status,
		       l.contract_number, c.name, c.email, c.phone
		FROM loan_installments li
		JOIN loans l ON li.loan_id = l.id
		JOIN customers c ON l.customer_id = c.id
		WHERE date(li.due_date) %s date(?)
		AND li.status != 'paid'
		AND l.status = 'active'`, comparison)

	rows, err := s.db.Query(query, targetDate.Format("2006-01-02"))
	if err != nil {
		return fmt.Errorf("failed to query installments: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var installmentID, loanID, contractNumber, customerName, encryptedEmail, encryptedPhone string
		var number, amountDue, amountPaid int64
		var dueDate time.Time
		var status string

		err := rows.Scan(
			&installmentID, &loanID, &number, &dueDate, &amountDue, &amountPaid, &status,
			&contractNumber, &customerName, &encryptedEmail, &encryptedPhone)
		if err != nil {
			log.Printf("Failed to scan installment: %v", err)
			continue
		}

		// Decrypt customer contact info
		email, _ := utils.Decrypt(encryptedEmail)
		phone, _ := utils.Decrypt(encryptedPhone)

		// Check if notification already sent today for this installment and template
		if s.isNotificationSentToday(installmentID, template.ID.String()) {
			continue
		}

		// Determine recipient based on notification type
		var recipient string
		if template.Type == models.NotificationTypeEmail {
			recipient = email
		} else if template.Type == models.NotificationTypeWhatsApp {
			recipient = phone
		}

		if recipient == "" {
			log.Printf("No recipient for %s notification to customer %s", template.Type, customerName)
			continue
		}

		// Schedule notification for immediate sending
		scheduledFor := today.Add(1 * time.Minute) // Send in 1 minute

		req := services.SendNotificationRequest{
			InstallmentID: installmentID,
			TemplateID:    template.ID.String(),
			Type:          template.Type,
			Recipient:     recipient,
			ScheduledFor:  scheduledFor,
		}

		_, err = s.notificationSvc.SendNotification(req)
		if err != nil {
			log.Printf("Failed to schedule notification for installment %s: %v", installmentID, err)
		} else {
			log.Printf("Scheduled %s reminder for customer %s (contract %s)", 
				template.ScheduleType, customerName, contractNumber)
		}
	}

	return nil
}

func (s *Scheduler) processPendingNotifications() {
	err := s.notificationSvc.ProcessPendingNotifications()
	if err != nil {
		log.Printf("Failed to process pending notifications: %v", err)
	}
}

func (s *Scheduler) updateDaysPastDue() {
	log.Println("Updating days past due...")

	// Update DPD for overdue installments
	_, err := s.db.Exec(`
		UPDATE loan_installments 
		SET dpd = CAST((julianday('now') - julianday(due_date)) AS INTEGER),
		    status = CASE 
		        WHEN status = 'pending' AND due_date < date('now') THEN 'overdue'
		        ELSE status
		    END
		WHERE due_date < date('now') AND status != 'paid'`)
	if err != nil {
		log.Printf("Failed to update DPD: %v", err)
		return
	}

	log.Println("DPD update completed")
}

func (s *Scheduler) getActiveTemplates() ([]models.NotificationTemplate, error) {
	rows, err := s.db.Query(`
		SELECT id, name, type, subject, body, schedule_type, active, created_at, updated_at
		FROM notification_templates
		WHERE active = true
		ORDER BY schedule_type, type`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	templates := make([]models.NotificationTemplate, 0)
	for rows.Next() {
		var template models.NotificationTemplate

		err := rows.Scan(
			&template.ID, &template.Name, &template.Type, &template.Subject,
			&template.Body, &template.ScheduleType, &template.Active,
			&template.CreatedAt, &template.UpdatedAt)
		if err != nil {
			return nil, err
		}

		templates = append(templates, template)
	}

	return templates, nil
}

func (s *Scheduler) isNotificationSentToday(installmentID, templateID string) bool {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*)
		FROM notification_logs
		WHERE installment_id = ? 
		AND template_id = ?
		AND date(created_at) = date('now')`,
		installmentID, templateID).Scan(&count)
	if err != nil {
		return false
	}

	return count > 0
}

// Manual trigger functions for testing
func (s *Scheduler) TriggerReminderNotifications() error {
	s.processReminderNotifications()
	return nil
}

func (s *Scheduler) TriggerPendingNotifications() error {
	s.processPendingNotifications()
	return nil
}

func (s *Scheduler) TriggerDPDUpdate() error {
	s.updateDaysPastDue()
	return nil
}

// Get scheduler status
func (s *Scheduler) GetStatus() map[string]interface{} {
	entries := s.cron.Entries()
	
	status := map[string]interface{}{
		"running":    len(entries) > 0,
		"jobs_count": len(entries),
		"timezone":   s.cron.Location().String(),
		"next_runs":  make([]string, 0),
	}

	// Get next run times
	for _, entry := range entries {
		status["next_runs"] = append(status["next_runs"].([]string), 
			entry.Next.Format("2006-01-02 15:04:05 MST"))
	}

	return status
}