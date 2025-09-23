package services

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
)

type ReferralService struct {
	db *database.DB
}

func NewReferralService(db *database.DB) *ReferralService {
	return &ReferralService{db: db}
}

type ReferralCodeCreateRequest struct {
	OwnerUserID string     `json:"owner_user_id"`
	Quota       int        `json:"quota"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

type ReferralCodeUpdateRequest struct {
	Quota     int        `json:"quota"`
	Active    bool       `json:"active"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type ReferralCodeListRequest struct {
	Page        int    `json:"page"`
	Limit       int    `json:"limit"`
	OwnerUserID string `json:"owner_user_id"`
	Active      *bool  `json:"active"`
}

type ReferralCodeListResponse struct {
	ReferralCodes []models.ReferralCode `json:"referral_codes"`
	Total         int                   `json:"total"`
	Page          int                   `json:"page"`
	Limit         int                   `json:"limit"`
}

func (s *ReferralService) CreateReferralCode(req ReferralCodeCreateRequest) (*models.ReferralCode, error) {
	// Validate owner user exists
	ownerUUID, err := uuid.Parse(req.OwnerUserID)
	if err != nil {
		return nil, fmt.Errorf("invalid owner user ID")
	}

	var existingUserID string
	err = s.db.QueryRow("SELECT id FROM users WHERE id = ?", ownerUUID.String()).Scan(&existingUserID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("owner user not found")
		}
		return nil, fmt.Errorf("failed to check owner user: %v", err)
	}

	// Validate quota
	if req.Quota <= 0 {
		return nil, fmt.Errorf("quota must be greater than 0")
	}

	// Generate unique code
	code, err := s.generateUniqueCode()
	if err != nil {
		return nil, fmt.Errorf("failed to generate unique code: %v", err)
	}

	referralCode := &models.ReferralCode{
		ID:          uuid.New(),
		Code:        code,
		OwnerUserID: ownerUUID,
		Quota:       req.Quota,
		Used:        0,
		Active:      true,
		ExpiresAt:   req.ExpiresAt,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Insert referral code
	_, err = s.db.Exec(`
		INSERT INTO referral_codes (id, code, owner_user_id, quota, used, active, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		referralCode.ID.String(), referralCode.Code, referralCode.OwnerUserID.String(),
		referralCode.Quota, referralCode.Used, referralCode.Active, referralCode.ExpiresAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert referral code: %v", err)
	}

	return referralCode, nil
}

func (s *ReferralService) GetReferralCode(id string) (*models.ReferralCode, error) {
	referralCodeID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid referral code ID")
	}

	var referralCode models.ReferralCode
	err = s.db.QueryRow(`
		SELECT rc.id, rc.code, rc.owner_user_id, rc.quota, rc.used, rc.active, rc.expires_at, rc.created_at, rc.updated_at,
		       u.name as owner_name, u.email as owner_email
		FROM referral_codes rc
		JOIN users u ON rc.owner_user_id = u.id
		WHERE rc.id = ?`, referralCodeID.String()).Scan(
		&referralCode.ID, &referralCode.Code, &referralCode.OwnerUserID,
		&referralCode.Quota, &referralCode.Used, &referralCode.Active,
		&referralCode.ExpiresAt, &referralCode.CreatedAt, &referralCode.UpdatedAt,
		&referralCode.OwnerUser.Name, &referralCode.OwnerUser.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("referral code not found")
		}
		return nil, fmt.Errorf("failed to get referral code: %v", err)
	}

	referralCode.OwnerUser = &models.User{
		ID:   referralCode.OwnerUserID,
		Name: referralCode.OwnerUser.Name,
		Email: referralCode.OwnerUser.Email,
	}

	return &referralCode, nil
}

func (s *ReferralService) UpdateReferralCode(id string, req ReferralCodeUpdateRequest) (*models.ReferralCode, error) {
	referralCodeID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid referral code ID")
	}

	// Validate quota
	if req.Quota <= 0 {
		return nil, fmt.Errorf("quota must be greater than 0")
	}

	// Check if referral code exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM referral_codes WHERE id = ?", referralCodeID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("referral code not found")
		}
		return nil, fmt.Errorf("failed to check referral code existence: %v", err)
	}

	// Update referral code
	_, err = s.db.Exec(`
		UPDATE referral_codes 
		SET quota = ?, active = ?, expires_at = ?
		WHERE id = ?`,
		req.Quota, req.Active, req.ExpiresAt, referralCodeID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update referral code: %v", err)
	}

	return s.GetReferralCode(id)
}

func (s *ReferralService) ListReferralCodes(req ReferralCodeListRequest) (*ReferralCodeListResponse, error) {
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
		SELECT rc.id, rc.code, rc.owner_user_id, rc.quota, rc.used, rc.active, rc.expires_at, rc.created_at, rc.updated_at,
		       u.name as owner_name, u.email as owner_email
		FROM referral_codes rc
		JOIN users u ON rc.owner_user_id = u.id
		WHERE 1=1`)

	// Add owner user filter
	if req.OwnerUserID != "" {
		queryBuilder.WriteString(" AND rc.owner_user_id = ?")
		args = append(args, req.OwnerUserID)
	}

	// Add active filter
	if req.Active != nil {
		queryBuilder.WriteString(" AND rc.active = ?")
		args = append(args, *req.Active)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY rc.created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query referral codes: %v", err)
	}
	defer rows.Close()

	referralCodes := make([]models.ReferralCode, 0)
	for rows.Next() {
		var referralCode models.ReferralCode
		var ownerName, ownerEmail string

		err := rows.Scan(
			&referralCode.ID, &referralCode.Code, &referralCode.OwnerUserID,
			&referralCode.Quota, &referralCode.Used, &referralCode.Active,
			&referralCode.ExpiresAt, &referralCode.CreatedAt, &referralCode.UpdatedAt,
			&ownerName, &ownerEmail)
		if err != nil {
			return nil, fmt.Errorf("failed to scan referral code: %v", err)
		}

		referralCode.OwnerUser = &models.User{
			ID:    referralCode.OwnerUserID,
			Name:  ownerName,
			Email: ownerEmail,
		}

		referralCodes = append(referralCodes, referralCode)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM referral_codes WHERE 1=1")

	if req.OwnerUserID != "" {
		countQuery.WriteString(" AND owner_user_id = ?")
		countArgs = append(countArgs, req.OwnerUserID)
	}

	if req.Active != nil {
		countQuery.WriteString(" AND active = ?")
		countArgs = append(countArgs, *req.Active)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count referral codes: %v", err)
	}

	return &ReferralCodeListResponse{
		ReferralCodes: referralCodes,
		Total:         total,
		Page:          req.Page,
		Limit:         req.Limit,
	}, nil
}

func (s *ReferralService) DeleteReferralCode(id string) error {
	referralCodeID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid referral code ID")
	}

	// Check if referral code exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM referral_codes WHERE id = ?", referralCodeID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("referral code not found")
		}
		return fmt.Errorf("failed to check referral code existence: %v", err)
	}

	// Check if referral code is being used
	var usageCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM customers WHERE referral_code_id = ?", referralCodeID.String()).Scan(&usageCount)
	if err != nil {
		return fmt.Errorf("failed to check referral code usage: %v", err)
	}

	if usageCount > 0 {
		return fmt.Errorf("cannot delete referral code that is being used by customers")
	}

	// Delete referral code
	_, err = s.db.Exec("DELETE FROM referral_codes WHERE id = ?", referralCodeID.String())
	if err != nil {
		return fmt.Errorf("failed to delete referral code: %v", err)
	}

	return nil
}

func (s *ReferralService) GetReferralPerformance(ownerUserID string) (map[string]interface{}, error) {
	ownerUUID, err := uuid.Parse(ownerUserID)
	if err != nil {
		return nil, fmt.Errorf("invalid owner user ID")
	}

	// Get total referral codes
	var totalCodes int
	err = s.db.QueryRow("SELECT COUNT(*) FROM referral_codes WHERE owner_user_id = ?", ownerUUID.String()).Scan(&totalCodes)
	if err != nil {
		return nil, fmt.Errorf("failed to get total codes: %v", err)
	}

	// Get active referral codes
	var activeCodes int
	err = s.db.QueryRow("SELECT COUNT(*) FROM referral_codes WHERE owner_user_id = ? AND active = true", ownerUUID.String()).Scan(&activeCodes)
	if err != nil {
		return nil, fmt.Errorf("failed to get active codes: %v", err)
	}

	// Get total customers acquired
	var totalCustomers int
	err = s.db.QueryRow(`
		SELECT COUNT(*) 
		FROM customers c 
		JOIN referral_codes rc ON c.referral_code_id = rc.id 
		WHERE rc.owner_user_id = ?`, ownerUUID.String()).Scan(&totalCustomers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total customers: %v", err)
	}

	// Get verified customers
	var verifiedCustomers int
	err = s.db.QueryRow(`
		SELECT COUNT(*) 
		FROM customers c 
		JOIN referral_codes rc ON c.referral_code_id = rc.id 
		WHERE rc.owner_user_id = ? AND c.ktp_verified = true`, ownerUUID.String()).Scan(&verifiedCustomers)
	if err != nil {
		return nil, fmt.Errorf("failed to get verified customers: %v", err)
	}

	// Get customers with loans
	var customersWithLoans int
	err = s.db.QueryRow(`
		SELECT COUNT(DISTINCT c.id)
		FROM customers c 
		JOIN referral_codes rc ON c.referral_code_id = rc.id
		JOIN loans l ON c.id = l.customer_id
		WHERE rc.owner_user_id = ?`, ownerUUID.String()).Scan(&customersWithLoans)
	if err != nil {
		return nil, fmt.Errorf("failed to get customers with loans: %v", err)
	}

	// Get total loan amount
	var totalLoanAmount sql.NullInt64
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(l.amount), 0)
		FROM customers c 
		JOIN referral_codes rc ON c.referral_code_id = rc.id
		JOIN loans l ON c.id = l.customer_id
		WHERE rc.owner_user_id = ?`, ownerUUID.String()).Scan(&totalLoanAmount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total loan amount: %v", err)
	}

	return map[string]interface{}{
		"total_codes":          totalCodes,
		"active_codes":         activeCodes,
		"total_customers":      totalCustomers,
		"verified_customers":   verifiedCustomers,
		"customers_with_loans": customersWithLoans,
		"total_loan_amount":    totalLoanAmount.Int64,
		"conversion_rate":      float64(verifiedCustomers) / float64(totalCustomers) * 100,
		"loan_conversion_rate": float64(customersWithLoans) / float64(totalCustomers) * 100,
	}, nil
}

func (s *ReferralService) generateUniqueCode() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const codeLength = 8

	for attempts := 0; attempts < 10; attempts++ {
		// Generate random code
		code := make([]byte, codeLength)
		for i := range code {
			randomIndex := make([]byte, 1)
			_, err := rand.Read(randomIndex)
			if err != nil {
				return "", err
			}
			code[i] = charset[randomIndex[0]%byte(len(charset))]
		}

		codeStr := string(code)

		// Check if code already exists
		var existingID string
		err := s.db.QueryRow("SELECT id FROM referral_codes WHERE code = ?", codeStr).Scan(&existingID)
		if err == sql.ErrNoRows {
			return codeStr, nil
		} else if err != nil {
			return "", err
		}
	}

	return "", fmt.Errorf("failed to generate unique code after 10 attempts")
}

func (s *ReferralService) ValidateReferralCode(code string) (*models.ReferralCode, error) {
	var referralCode models.ReferralCode
	err := s.db.QueryRow(`
		SELECT id, code, owner_user_id, quota, used, active, expires_at, created_at, updated_at
		FROM referral_codes 
		WHERE code = ? AND active = true AND (expires_at IS NULL OR expires_at > datetime('now'))`,
		code).Scan(
		&referralCode.ID, &referralCode.Code, &referralCode.OwnerUserID,
		&referralCode.Quota, &referralCode.Used, &referralCode.Active,
		&referralCode.ExpiresAt, &referralCode.CreatedAt, &referralCode.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("kode referral tidak valid atau sudah kadaluarsa")
		}
		return nil, fmt.Errorf("failed to validate referral code: %v", err)
	}

	if referralCode.Used >= referralCode.Quota {
		return nil, fmt.Errorf("kode referral sudah mencapai batas penggunaan")
	}

	return &referralCode, nil
}