package services

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"strings"
	"text/template"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
)

type NotificationService struct {
	db  *database.DB
	cfg *config.Config
}

func NewNotificationService(db *database.DB, cfg *config.Config) *NotificationService {
	return &NotificationService{db: db, cfg: cfg}
}

// NotificationProvider interface for different providers
type NotificationProvider interface {
	Send(recipient, subject, body string) error
	GetType() models.NotificationType
}

// EmailProvider implements SMTP email sending
type EmailProvider struct {
	config config.SMTPConfig
}

func NewEmailProvider(cfg config.SMTPConfig) *EmailProvider {
	return &EmailProvider{config: cfg}
}

func (e *EmailProvider) GetType() models.NotificationType {
	return models.NotificationTypeEmail
}

func (e *EmailProvider) Send(recipient, subject, body string) error {
	if e.config.Host == "" || e.config.Username == "" {
		return fmt.Errorf("SMTP configuration not set")
	}

	auth := smtp.PlainAuth("", e.config.Username, e.config.Password, e.config.Host)

	msg := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		recipient, subject, body)

	addr := fmt.Sprintf("%s:%d", e.config.Host, e.config.Port)
	return smtp.SendMail(addr, auth, e.config.From, []string{recipient}, []byte(msg))
}

// WhatsAppProvider implements Meta Cloud API WhatsApp sending
type WhatsAppProvider struct {
	config config.WhatsAppConfig
	client *http.Client
}

func NewWhatsAppProvider(cfg config.WhatsAppConfig) *WhatsAppProvider {
	return &WhatsAppProvider{
		config: cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (w *WhatsAppProvider) GetType() models.NotificationType {
	return models.NotificationTypeWhatsApp
}

func (w *WhatsAppProvider) Send(recipient, subject, body string) error {
	if w.config.AccessToken == "" || w.config.PhoneNumberID == "" {
		return fmt.Errorf("WhatsApp configuration not set")
	}

	// Clean phone number (remove + and spaces)
	cleanPhone := strings.ReplaceAll(recipient, "+", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, " ", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, "-", "")

	// Convert 08xx to 628xx format for WhatsApp
	if strings.HasPrefix(cleanPhone, "08") {
		cleanPhone = "62" + cleanPhone[1:]
	}

	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":               cleanPhone,
		"type":             "text",
		"text": map[string]string{
			"body": body,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal WhatsApp payload: %v", err)
	}

	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/messages", w.config.PhoneNumberID)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create WhatsApp request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+w.config.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := w.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send WhatsApp message: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("WhatsApp API returned status %d", resp.StatusCode)
	}

	return nil
}

// Mock provider for offline testing
type MockProvider struct {
	notificationType models.NotificationType
}

func NewMockProvider(notificationType models.NotificationType) *MockProvider {
	return &MockProvider{notificationType: notificationType}
}

func (m *MockProvider) GetType() models.NotificationType {
	return m.notificationType
}

func (m *MockProvider) Send(recipient, subject, body string) error {
	// Log the message instead of actually sending
	fmt.Printf("[MOCK %s] To: %s, Subject: %s, Body: %s\n", 
		m.notificationType, recipient, subject, body)
	return nil
}

// Template data for notifications
type NotificationData struct {
	Nama           string
	NoKontrak      string
	JatuhTempo     string
	Jumlah         string
	LinkPembayaran string
	KontakCS       string
}

type SendNotificationRequest struct {
	InstallmentID string                     `json:"installment_id"`
	TemplateID    string                     `json:"template_id"`
	Type          models.NotificationType    `json:"type"`
	Recipient     string                     `json:"recipient"`
	ScheduledFor  time.Time                  `json:"scheduled_for"`
}

type NotificationTestRequest struct {
	Type      models.NotificationType `json:"type"`
	Recipient string                  `json:"recipient"`
	Subject   string                  `json:"subject"`
	Body      string                  `json:"body"`
}

func (s *NotificationService) GetProvider(notificationType models.NotificationType) NotificationProvider {
	switch notificationType {
	case models.NotificationTypeEmail:
		if s.cfg.SMTP.Host != "" {
			return NewEmailProvider(s.cfg.SMTP)
		}
		return NewMockProvider(models.NotificationTypeEmail)
	case models.NotificationTypeWhatsApp:
		if s.cfg.WhatsApp.AccessToken != "" {
			return NewWhatsAppProvider(s.cfg.WhatsApp)
		}
		return NewMockProvider(models.NotificationTypeWhatsApp)
	default:
		return NewMockProvider(notificationType)
	}
}

func (s *NotificationService) SendNotification(req SendNotificationRequest) (*models.NotificationLog, error) {
	// Validate installment exists
	installmentID, err := uuid.Parse(req.InstallmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid installment ID")
	}

	// Validate template exists
	templateID, err := uuid.Parse(req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("invalid template ID")
	}

	// Get installment data
	var installment models.LoanInstallment
	var customerName, contractNumber string
	err = s.db.QueryRow(`
		SELECT li.id, li.loan_id, li.number, li.due_date, li.amount_due, li.amount_paid, li.status,
		       l.contract_number, c.name
		FROM loan_installments li
		JOIN loans l ON li.loan_id = l.id
		JOIN customers c ON l.customer_id = c.id
		WHERE li.id = ?`, installmentID.String()).Scan(
		&installment.ID, &installment.LoanID, &installment.Number, &installment.DueDate,
		&installment.AmountDue, &installment.AmountPaid, &installment.Status,
		&contractNumber, &customerName)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("installment not found")
		}
		return nil, fmt.Errorf("failed to get installment: %v", err)
	}

	// Get template
	var template models.NotificationTemplate
	err = s.db.QueryRow(`
		SELECT id, name, type, subject, body, schedule_type, active
		FROM notification_templates
		WHERE id = ? AND active = true`, templateID.String()).Scan(
		&template.ID, &template.Name, &template.Type, &template.Subject,
		&template.Body, &template.ScheduleType, &template.Active)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("template not found or inactive")
		}
		return nil, fmt.Errorf("failed to get template: %v", err)
	}

	// Check for rate limiting (WhatsApp only)
	if req.Type == models.NotificationTypeWhatsApp {
		var recentCount int
		err = s.db.QueryRow(`
			SELECT COUNT(*)
			FROM notification_logs nl
			JOIN loan_installments li ON nl.installment_id = li.id
			JOIN loans l ON li.loan_id = l.id
			WHERE l.contract_number = ? 
			AND nl.type = 'whatsapp' 
			AND nl.sent_at > datetime('now', '-24 hours')`,
			contractNumber).Scan(&recentCount)
		if err == nil && recentCount > 0 {
			return nil, fmt.Errorf("WhatsApp rate limit: only 1 message per 24 hours per contract")
		}
	}

	// Prepare template data
	data := NotificationData{
		Nama:           customerName,
		NoKontrak:      contractNumber,
		JatuhTempo:     installment.DueDate.Format("02/01/2006"),
		Jumlah:         formatCurrency(installment.AmountDue),
		LinkPembayaran: "https://pay.koperasi.com/" + contractNumber,
		KontakCS:       "0811-2345-6789",
	}

	// Render template
	subject, err := s.renderTemplate(template.Subject, data)
	if err != nil {
		return nil, fmt.Errorf("failed to render subject template: %v", err)
	}

	body, err := s.renderTemplate(template.Body, data)
	if err != nil {
		return nil, fmt.Errorf("failed to render body template: %v", err)
	}

	// Create notification log
	notifLog := &models.NotificationLog{
		ID:            uuid.New(),
		InstallmentID: installmentID,
		TemplateID:    templateID,
		Type:          req.Type,
		Recipient:     req.Recipient,
		Subject:       subject,
		Body:          body,
		Status:        models.NotificationStatusPending,
		ScheduledFor:  req.ScheduledFor,
		Attempts:      0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Insert notification log
	_, err = s.db.Exec(`
		INSERT INTO notification_logs 
		(id, installment_id, template_id, type, recipient, subject, body, status, scheduled_for, attempts)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		notifLog.ID.String(), notifLog.InstallmentID.String(), notifLog.TemplateID.String(),
		string(notifLog.Type), notifLog.Recipient, notifLog.Subject, notifLog.Body,
		string(notifLog.Status), notifLog.ScheduledFor, notifLog.Attempts)
	if err != nil {
		return nil, fmt.Errorf("failed to insert notification log: %v", err)
	}

	// Send notification if scheduled for now or past
	if req.ScheduledFor.Before(time.Now()) || req.ScheduledFor.Equal(time.Now()) {
		err = s.processNotification(notifLog.ID.String())
		if err != nil {
			// Don't return error, just log it
			fmt.Printf("Failed to send notification %s: %v\n", notifLog.ID.String(), err)
		}
	}

	return notifLog, nil
}

func (s *NotificationService) processNotification(notificationID string) error {
	notifID, err := uuid.Parse(notificationID)
	if err != nil {
		return fmt.Errorf("invalid notification ID")
	}

	// Get notification log
	var notifLog models.NotificationLog
	err = s.db.QueryRow(`
		SELECT id, installment_id, template_id, type, recipient, subject, body, status, attempts, last_attempt_at
		FROM notification_logs
		WHERE id = ?`, notifID.String()).Scan(
		&notifLog.ID, &notifLog.InstallmentID, &notifLog.TemplateID, &notifLog.Type,
		&notifLog.Recipient, &notifLog.Subject, &notifLog.Body, &notifLog.Status,
		&notifLog.Attempts, &notifLog.LastAttemptAt)
	if err != nil {
		return fmt.Errorf("failed to get notification log: %v", err)
	}

	// Skip if already sent or exceeded retry limit
	if notifLog.Status == models.NotificationStatusSent || notifLog.Attempts >= 3 {
		return nil
	}

	// Get provider
	provider := s.GetProvider(notifLog.Type)

	// Update attempt count
	_, err = s.db.Exec(`
		UPDATE notification_logs 
		SET attempts = attempts + 1, last_attempt_at = datetime('now')
		WHERE id = ?`, notifID.String())
	if err != nil {
		return fmt.Errorf("failed to update attempt count: %v", err)
	}

	// Send notification
	err = provider.Send(notifLog.Recipient, notifLog.Subject, notifLog.Body)
	
	// Update status based on result
	var status models.NotificationStatus
	var errorMessage string
	var sentAt *time.Time
	
	if err != nil {
		status = models.NotificationStatusFailed
		errorMessage = err.Error()
		// Don't set sentAt for failed notifications
	} else {
		status = models.NotificationStatusSent
		now := time.Now()
		sentAt = &now
	}

	// Update notification log
	_, err = s.db.Exec(`
		UPDATE notification_logs 
		SET status = ?, error_message = ?, sent_at = ?
		WHERE id = ?`,
		string(status), errorMessage, sentAt, notifID.String())
	if err != nil {
		return fmt.Errorf("failed to update notification status: %v", err)
	}

	return nil
}

func (s *NotificationService) TestNotification(req NotificationTestRequest) error {
	provider := s.GetProvider(req.Type)
	return provider.Send(req.Recipient, req.Subject, req.Body)
}

func (s *NotificationService) GetPendingNotifications() ([]models.NotificationLog, error) {
	rows, err := s.db.Query(`
		SELECT nl.id, nl.installment_id, nl.template_id, nl.type, nl.recipient, nl.subject, nl.body,
		       nl.status, nl.sent_at, nl.scheduled_for, nl.attempts, nl.last_attempt_at, nl.error_message,
		       nl.created_at, nl.updated_at
		FROM notification_logs nl
		WHERE nl.status = 'pending' AND nl.scheduled_for <= datetime('now')
		ORDER BY nl.scheduled_for ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending notifications: %v", err)
	}
	defer rows.Close()

	notifications := make([]models.NotificationLog, 0)
	for rows.Next() {
		var notif models.NotificationLog
		
		err := rows.Scan(
			&notif.ID, &notif.InstallmentID, &notif.TemplateID, &notif.Type,
			&notif.Recipient, &notif.Subject, &notif.Body, &notif.Status,
			&notif.SentAt, &notif.ScheduledFor, &notif.Attempts,
			&notif.LastAttemptAt, &notif.ErrorMessage, &notif.CreatedAt, &notif.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification: %v", err)
		}

		notifications = append(notifications, notif)
	}

	return notifications, nil
}

func (s *NotificationService) ProcessPendingNotifications() error {
	notifications, err := s.GetPendingNotifications()
	if err != nil {
		return err
	}

	for _, notif := range notifications {
		err := s.processNotification(notif.ID.String())
		if err != nil {
			fmt.Printf("Failed to process notification %s: %v\n", notif.ID.String(), err)
		}
	}

	return nil
}

// Helper functions

func (s *NotificationService) renderTemplate(templateStr string, data NotificationData) (string, error) {
	tmpl, err := template.New("notification").Parse(templateStr)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, data)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

func formatCurrency(amount int64) string {
	// Simple Indonesian Rupiah formatting
	str := fmt.Sprintf("%d", amount)
	n := len(str)
	if n <= 3 {
		return "Rp " + str
	}

	// Add thousand separators
	result := "Rp "
	for i, c := range str {
		if i > 0 && (n-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}

	return result
}