package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
)

type AuditService struct {
	db *database.DB
}

func NewAuditService(db *database.DB) *AuditService {
	return &AuditService{db: db}
}

type AuditLogRequest struct {
	UserID    *string     `json:"user_id"`
	Action    string      `json:"action"`
	Entity    string      `json:"entity"`
	EntityID  string      `json:"entity_id"`
	Before    interface{} `json:"before"`
	After     interface{} `json:"after"`
	IPAddress string      `json:"ip_address"`
	UserAgent string      `json:"user_agent"`
}

type AuditLogListRequest struct {
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
	UserID   string `json:"user_id"`
	Entity   string `json:"entity"`
	EntityID string `json:"entity_id"`
	Action   string `json:"action"`
	DateFrom string `json:"date_from"`
	DateTo   string `json:"date_to"`
}

type AuditLogListResponse struct {
	AuditLogs []models.AuditLog `json:"audit_logs"`
	Total     int               `json:"total"`
	Page      int               `json:"page"`
	Limit     int               `json:"limit"`
}

func (s *AuditService) LogAction(req AuditLogRequest) (*models.AuditLog, error) {
	var userID *uuid.UUID
	if req.UserID != nil {
		if parsedUUID, err := uuid.Parse(*req.UserID); err == nil {
			userID = &parsedUUID
		}
	}

	// Convert before and after to JSON strings
	var beforeJSON, afterJSON string
	
	if req.Before != nil {
		if beforeBytes, err := json.Marshal(req.Before); err == nil {
			beforeJSON = string(beforeBytes)
		}
	}
	
	if req.After != nil {
		if afterBytes, err := json.Marshal(req.After); err == nil {
			afterJSON = string(afterBytes)
		}
	}

	auditLog := &models.AuditLog{
		ID:        uuid.New(),
		UserID:    userID,
		Action:    req.Action,
		Entity:    req.Entity,
		EntityID:  req.EntityID,
		Before:    beforeJSON,
		After:     afterJSON,
		IPAddress: req.IPAddress,
		UserAgent: req.UserAgent,
		CreatedAt: time.Now(),
	}

	// Insert audit log
	var userIDStr *string
	if userID != nil {
		str := userID.String()
		userIDStr = &str
	}

	_, err := s.db.Exec(`
		INSERT INTO audit_logs (id, user_id, action, entity, entity_id, before, after, ip_address, user_agent)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		auditLog.ID.String(), userIDStr, auditLog.Action, auditLog.Entity, auditLog.EntityID,
		auditLog.Before, auditLog.After, auditLog.IPAddress, auditLog.UserAgent)
	if err != nil {
		return nil, fmt.Errorf("failed to insert audit log: %v", err)
	}

	return auditLog, nil
}

func (s *AuditService) GetAuditLog(id string) (*models.AuditLog, error) {
	auditLogID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid audit log ID")
	}

	var auditLog models.AuditLog
	var userIDStr *string
	var userName *string

	err = s.db.QueryRow(`
		SELECT al.id, al.user_id, al.action, al.entity, al.entity_id, al.before, al.after, 
		       al.ip_address, al.user_agent, al.created_at,
		       u.name as user_name
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		WHERE al.id = ?`, auditLogID.String()).Scan(
		&auditLog.ID, &userIDStr, &auditLog.Action, &auditLog.Entity, &auditLog.EntityID,
		&auditLog.Before, &auditLog.After, &auditLog.IPAddress, &auditLog.UserAgent,
		&auditLog.CreatedAt, &userName)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit log: %v", err)
	}

	// Parse user ID
	if userIDStr != nil {
		if parsedUUID, err := uuid.Parse(*userIDStr); err == nil {
			auditLog.UserID = &parsedUUID
		}
	}

	// Set user info if available
	if userName != nil {
		auditLog.User = &models.User{
			ID:   *auditLog.UserID,
			Name: *userName,
		}
	}

	return &auditLog, nil
}

func (s *AuditService) ListAuditLogs(req AuditLogListRequest) (*AuditLogListResponse, error) {
	// Set defaults
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	offset := (req.Page - 1) * req.Limit

	// Build query
	queryBuilder := strings.Builder{}
	args := make([]interface{}, 0)

	queryBuilder.WriteString(`
		SELECT al.id, al.user_id, al.action, al.entity, al.entity_id, al.before, al.after,
		       al.ip_address, al.user_agent, al.created_at,
		       u.name as user_name, u.email as user_email
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		WHERE 1=1`)

	// Add user filter
	if req.UserID != "" {
		queryBuilder.WriteString(" AND al.user_id = ?")
		args = append(args, req.UserID)
	}

	// Add entity filter
	if req.Entity != "" {
		queryBuilder.WriteString(" AND al.entity = ?")
		args = append(args, req.Entity)
	}

	// Add entity ID filter
	if req.EntityID != "" {
		queryBuilder.WriteString(" AND al.entity_id = ?")
		args = append(args, req.EntityID)
	}

	// Add action filter
	if req.Action != "" {
		queryBuilder.WriteString(" AND al.action = ?")
		args = append(args, req.Action)
	}

	// Add date range filters
	if req.DateFrom != "" {
		queryBuilder.WriteString(" AND date(al.created_at) >= date(?)")
		args = append(args, req.DateFrom)
	}
	if req.DateTo != "" {
		queryBuilder.WriteString(" AND date(al.created_at) <= date(?)")
		args = append(args, req.DateTo)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY al.created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %v", err)
	}
	defer rows.Close()

	auditLogs := make([]models.AuditLog, 0)
	for rows.Next() {
		var auditLog models.AuditLog
		var userIDStr *string
		var userName, userEmail *string

		err := rows.Scan(
			&auditLog.ID, &userIDStr, &auditLog.Action, &auditLog.Entity, &auditLog.EntityID,
			&auditLog.Before, &auditLog.After, &auditLog.IPAddress, &auditLog.UserAgent,
			&auditLog.CreatedAt, &userName, &userEmail)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %v", err)
		}

		// Parse user ID
		if userIDStr != nil {
			if parsedUUID, err := uuid.Parse(*userIDStr); err == nil {
				auditLog.UserID = &parsedUUID
			}
		}

		// Set user info if available
		if userName != nil && userEmail != nil {
			auditLog.User = &models.User{
				ID:    *auditLog.UserID,
				Name:  *userName,
				Email: *userEmail,
			}
		}

		auditLogs = append(auditLogs, auditLog)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM audit_logs al WHERE 1=1")

	if req.UserID != "" {
		countQuery.WriteString(" AND al.user_id = ?")
		countArgs = append(countArgs, req.UserID)
	}

	if req.Entity != "" {
		countQuery.WriteString(" AND al.entity = ?")
		countArgs = append(countArgs, req.Entity)
	}

	if req.EntityID != "" {
		countQuery.WriteString(" AND al.entity_id = ?")
		countArgs = append(countArgs, req.EntityID)
	}

	if req.Action != "" {
		countQuery.WriteString(" AND al.action = ?")
		countArgs = append(countArgs, req.Action)
	}

	if req.DateFrom != "" {
		countQuery.WriteString(" AND date(al.created_at) >= date(?)")
		countArgs = append(countArgs, req.DateFrom)
	}

	if req.DateTo != "" {
		countQuery.WriteString(" AND date(al.created_at) <= date(?)")
		countArgs = append(countArgs, req.DateTo)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count audit logs: %v", err)
	}

	return &AuditLogListResponse{
		AuditLogs: auditLogs,
		Total:     total,
		Page:      req.Page,
		Limit:     req.Limit,
	}, nil
}

func (s *AuditService) GetAuditSummary(entityID string) (map[string]interface{}, error) {
	// Get audit summary for a specific entity
	rows, err := s.db.Query(`
		SELECT action, COUNT(*) as count, MAX(created_at) as last_action
		FROM audit_logs
		WHERE entity_id = ?
		GROUP BY action
		ORDER BY count DESC`, entityID)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit summary: %v", err)
	}
	defer rows.Close()

	actions := make([]map[string]interface{}, 0)
	totalActions := 0

	for rows.Next() {
		var action string
		var count int
		var lastAction time.Time

		err := rows.Scan(&action, &count, &lastAction)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit summary: %v", err)
		}

		actions = append(actions, map[string]interface{}{
			"action":      action,
			"count":       count,
			"last_action": lastAction,
		})

		totalActions += count
	}

	// Get first and last activity
	var firstActivity, lastActivity *time.Time
	err = s.db.QueryRow(`
		SELECT MIN(created_at), MAX(created_at)
		FROM audit_logs
		WHERE entity_id = ?`, entityID).Scan(&firstActivity, &lastActivity)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity dates: %v", err)
	}

	return map[string]interface{}{
		"entity_id":       entityID,
		"total_actions":   totalActions,
		"actions":         actions,
		"first_activity":  firstActivity,
		"last_activity":   lastActivity,
	}, nil
}

// Helper functions for common audit actions

func (s *AuditService) LogCustomerCreate(userID *string, customer *models.Customer, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "create",
		Entity:    "customer",
		EntityID:  customer.ID.String(),
		Before:    nil,
		After:     customer,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogCustomerUpdate(userID *string, before, after *models.Customer, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "update",
		Entity:    "customer",
		EntityID:  after.ID.String(),
		Before:    before,
		After:     after,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogCustomerDelete(userID *string, customer *models.Customer, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "delete",
		Entity:    "customer",
		EntityID:  customer.ID.String(),
		Before:    customer,
		After:     nil,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogLoanCreate(userID *string, loan *models.Loan, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "create",
		Entity:    "loan",
		EntityID:  loan.ID.String(),
		Before:    nil,
		After:     loan,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogLoanDisburse(userID *string, loan *models.Loan, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "disburse",
		Entity:    "loan",
		EntityID:  loan.ID.String(),
		Before:    nil,
		After:     loan,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogInstallmentPayment(userID *string, installment *models.LoanInstallment, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "payment",
		Entity:    "installment",
		EntityID:  installment.ID.String(),
		Before:    nil,
		After:     installment,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}

func (s *AuditService) LogDocumentVerify(userID *string, document *models.Document, ipAddress, userAgent string) error {
	req := AuditLogRequest{
		UserID:    userID,
		Action:    "verify",
		Entity:    "document",
		EntityID:  document.ID.String(),
		Before:    nil,
		After:     document,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	_, err := s.LogAction(req)
	return err
}