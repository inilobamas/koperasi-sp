package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
	"koperasi-app/internal/utils"
)

type CustomerService struct {
	db *database.DB
}

func NewCustomerService(db *database.DB) *CustomerService {
	return &CustomerService{db: db}
}

type CustomerCreateRequest struct {
	NIK             string    `json:"nik"`
	Name            string    `json:"name"`
	Email           string    `json:"email"`
	Phone           string    `json:"phone"`
	DateOfBirth     time.Time `json:"date_of_birth"`
	Address         string    `json:"address"`
	City            string    `json:"city"`
	Province        string    `json:"province"`
	PostalCode      string    `json:"postal_code"`
	Occupation      string    `json:"occupation"`
	MonthlyIncome   int64     `json:"monthly_income"`
	ReferralCode    string    `json:"referral_code"`
}

type CustomerUpdateRequest struct {
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	DateOfBirth   time.Time `json:"date_of_birth"`
	Address       string    `json:"address"`
	City          string    `json:"city"`
	Province      string    `json:"province"`
	PostalCode    string    `json:"postal_code"`
	Occupation    string    `json:"occupation"`
	MonthlyIncome int64     `json:"monthly_income"`
	Status        string    `json:"status"`
}

type CustomerListRequest struct {
	Page        int    `json:"page"`
	Limit       int    `json:"limit"`
	Search      string `json:"search"`
	Status      string `json:"status"`
	Verified    *bool  `json:"verified"`
	OwnerUserID string `json:"owner_user_id"`
}

type CustomerListResponse struct {
	Customers []models.Customer `json:"customers"`
	Total     int               `json:"total"`
	Page      int               `json:"page"`
	Limit     int               `json:"limit"`
}

func (s *CustomerService) CreateCustomer(req CustomerCreateRequest) (*models.Customer, error) {
	// Validate required fields
	if err := utils.ValidateRequired(req.NIK, "NIK"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Name, "Nama"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Phone, "Nomor Telepon"); err != nil {
		return nil, err
	}

	// Validate NIK
	if err := utils.ValidateNIK(req.NIK); err != nil {
		return nil, err
	}

	// Validate phone
	if err := utils.ValidateIndonesianPhone(req.Phone); err != nil {
		return nil, err
	}

	// Validate email if provided
	if req.Email != "" {
		if err := utils.ValidateEmail(req.Email); err != nil {
			return nil, err
		}
	}

	// Check if NIK already exists
	encryptedNIK, err := utils.Encrypt(req.NIK)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt NIK: %v", err)
	}

	var existingID string
	err = s.db.QueryRow("SELECT id FROM customers WHERE nik = ?", encryptedNIK).Scan(&existingID)
	if err != sql.ErrNoRows {
		if err == nil {
			return nil, fmt.Errorf("NIK sudah terdaftar")
		}
		return nil, fmt.Errorf("failed to check existing NIK: %v", err)
	}

	// Check if phone already exists
	encryptedPhone, err := utils.Encrypt(req.Phone)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt phone: %v", err)
	}

	err = s.db.QueryRow("SELECT id FROM customers WHERE phone = ?", encryptedPhone).Scan(&existingID)
	if err != sql.ErrNoRows {
		if err == nil {
			return nil, fmt.Errorf("nomor telepon sudah terdaftar")
		}
		return nil, fmt.Errorf("failed to check existing phone: %v", err)
	}

	// Get referral code if provided
	var referralCodeID *uuid.UUID
	if req.ReferralCode != "" {
		var refID string
		var quota, used int
		err = s.db.QueryRow(`
			SELECT id, quota, used 
			FROM referral_codes 
			WHERE code = ? AND active = true AND (expires_at IS NULL OR expires_at > datetime('now'))`,
			req.ReferralCode).Scan(&refID, &quota, &used)
		if err != nil {
			if err == sql.ErrNoRows {
				return nil, fmt.Errorf("kode referral tidak valid atau sudah kadaluarsa")
			}
			return nil, fmt.Errorf("failed to check referral code: %v", err)
		}

		if used >= quota {
			return nil, fmt.Errorf("kode referral sudah mencapai batas penggunaan")
		}

		if parsedUUID, err := uuid.Parse(refID); err == nil {
			referralCodeID = &parsedUUID
		}
	}

	// Encrypt sensitive data
	encryptedEmail, err := utils.Encrypt(req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt email: %v", err)
	}

	customer := &models.Customer{
		ID:            uuid.New(),
		NIK:           req.NIK,
		Name:          req.Name,
		Email:         req.Email,
		Phone:         req.Phone,
		DateOfBirth:   req.DateOfBirth,
		Address:       req.Address,
		City:          req.City,
		Province:      req.Province,
		PostalCode:    req.PostalCode,
		Occupation:    req.Occupation,
		MonthlyIncome: req.MonthlyIncome,
		ReferralCodeID: referralCodeID,
		Status:        models.CustomerStatusPending,
		KTPVerified:   false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Insert customer
	var referralCodeIDStr *string
	if referralCodeID != nil {
		str := referralCodeID.String()
		referralCodeIDStr = &str
	}

	_, err = s.db.Exec(`
		INSERT INTO customers 
		(id, nik, name, email, phone, date_of_birth, address, city, province, postal_code, occupation, monthly_income, referral_code_id, status, ktp_verified)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		customer.ID.String(), encryptedNIK, customer.Name, encryptedEmail, encryptedPhone,
		customer.DateOfBirth, customer.Address, customer.City, customer.Province, customer.PostalCode,
		customer.Occupation, customer.MonthlyIncome, referralCodeIDStr, string(customer.Status), customer.KTPVerified)
	if err != nil {
		return nil, fmt.Errorf("failed to insert customer: %v", err)
	}

	// Update referral code usage if applicable
	if referralCodeID != nil {
		_, err = s.db.Exec("UPDATE referral_codes SET used = used + 1 WHERE id = ?", referralCodeID.String())
		if err != nil {
			return nil, fmt.Errorf("failed to update referral code usage: %v", err)
		}
	}

	return customer, nil
}

func (s *CustomerService) GetCustomer(id string) (*models.Customer, error) {
	customerID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID")
	}

	var customer models.Customer
	var encryptedNIK, encryptedEmail, encryptedPhone string
	var referralCodeIDStr *string

	err = s.db.QueryRow(`
		SELECT id, nik, name, email, phone, date_of_birth, address, city, province, postal_code, 
		       occupation, monthly_income, referral_code_id, status, ktp_verified, created_at, updated_at
		FROM customers WHERE id = ?`, customerID.String()).Scan(
		&customer.ID, &encryptedNIK, &customer.Name, &encryptedEmail, &encryptedPhone,
		&customer.DateOfBirth, &customer.Address, &customer.City, &customer.Province,
		&customer.PostalCode, &customer.Occupation, &customer.MonthlyIncome,
		&referralCodeIDStr, &customer.Status, &customer.KTPVerified,
		&customer.CreatedAt, &customer.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to get customer: %v", err)
	}

	// Decrypt sensitive data
	customer.NIK, _ = utils.Decrypt(encryptedNIK)
	customer.Email, _ = utils.Decrypt(encryptedEmail)
	customer.Phone, _ = utils.Decrypt(encryptedPhone)

	// Parse referral code ID
	if referralCodeIDStr != nil {
		if parsedUUID, err := uuid.Parse(*referralCodeIDStr); err == nil {
			customer.ReferralCodeID = &parsedUUID
		}
	}

	return &customer, nil
}

func (s *CustomerService) UpdateCustomer(id string, req CustomerUpdateRequest) (*models.Customer, error) {
	customerID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID")
	}

	// Validate required fields
	if err := utils.ValidateRequired(req.Name, "Nama"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Phone, "Nomor Telepon"); err != nil {
		return nil, err
	}

	// Validate phone
	if err := utils.ValidateIndonesianPhone(req.Phone); err != nil {
		return nil, err
	}

	// Validate email if provided
	if req.Email != "" {
		if err := utils.ValidateEmail(req.Email); err != nil {
			return nil, err
		}
	}

	// Check if customer exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM customers WHERE id = ?", customerID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to check customer existence: %v", err)
	}

	// Encrypt sensitive data
	encryptedEmail, err := utils.Encrypt(req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt email: %v", err)
	}

	encryptedPhone, err := utils.Encrypt(req.Phone)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt phone: %v", err)
	}

	// Update customer
	_, err = s.db.Exec(`
		UPDATE customers 
		SET name = ?, email = ?, phone = ?, date_of_birth = ?, address = ?, city = ?, province = ?, 
		    postal_code = ?, occupation = ?, monthly_income = ?, status = ?
		WHERE id = ?`,
		req.Name, encryptedEmail, encryptedPhone, req.DateOfBirth, req.Address, req.City,
		req.Province, req.PostalCode, req.Occupation, req.MonthlyIncome, req.Status, customerID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update customer: %v", err)
	}

	return s.GetCustomer(id)
}

func (s *CustomerService) ListCustomers(req CustomerListRequest) (*CustomerListResponse, error) {
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
		SELECT c.id, c.nik, c.name, c.email, c.phone, c.date_of_birth, c.address, c.city, c.province, c.postal_code,
		       c.occupation, c.monthly_income, c.referral_code_id, c.status, c.ktp_verified, c.created_at, c.updated_at
		FROM customers c 
		LEFT JOIN referral_codes rc ON c.referral_code_id = rc.id
		WHERE 1=1`)

	// Add search filter
	if req.Search != "" {
		queryBuilder.WriteString(" AND (c.name LIKE ? OR c.address LIKE ? OR c.city LIKE ?)")
		searchPattern := "%" + req.Search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	// Add status filter
	if req.Status != "" {
		queryBuilder.WriteString(" AND c.status = ?")
		args = append(args, req.Status)
	}

	// Add verified filter
	if req.Verified != nil {
		queryBuilder.WriteString(" AND c.ktp_verified = ?")
		args = append(args, *req.Verified)
	}

	// Add owner user ID filter (for karyawan to see only their customers)
	if req.OwnerUserID != "" {
		queryBuilder.WriteString(" AND rc.owner_user_id = ?")
		args = append(args, req.OwnerUserID)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query customers: %v", err)
	}
	defer rows.Close()

	customers := make([]models.Customer, 0)
	for rows.Next() {
		var customer models.Customer
		var encryptedNIK, encryptedEmail, encryptedPhone string
		var referralCodeIDStr *string

		err := rows.Scan(
			&customer.ID, &encryptedNIK, &customer.Name, &encryptedEmail, &encryptedPhone,
			&customer.DateOfBirth, &customer.Address, &customer.City, &customer.Province,
			&customer.PostalCode, &customer.Occupation, &customer.MonthlyIncome,
			&referralCodeIDStr, &customer.Status, &customer.KTPVerified,
			&customer.CreatedAt, &customer.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer: %v", err)
		}

		// Decrypt and mask sensitive data for list view
		if decryptedNIK, err := utils.Decrypt(encryptedNIK); err == nil {
			customer.NIK = utils.MaskNIK(decryptedNIK)
		}
		if decryptedEmail, err := utils.Decrypt(encryptedEmail); err == nil {
			customer.Email = utils.MaskEmail(decryptedEmail)
		}
		if decryptedPhone, err := utils.Decrypt(encryptedPhone); err == nil {
			customer.Phone = utils.MaskPhone(decryptedPhone)
		}

		// Parse referral code ID
		if referralCodeIDStr != nil {
			if parsedUUID, err := uuid.Parse(*referralCodeIDStr); err == nil {
				customer.ReferralCodeID = &parsedUUID
			}
		}

		customers = append(customers, customer)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM customers c LEFT JOIN referral_codes rc ON c.referral_code_id = rc.id WHERE 1=1")

	if req.Search != "" {
		countQuery.WriteString(" AND (c.name LIKE ? OR c.address LIKE ? OR c.city LIKE ?)")
		searchPattern := "%" + req.Search + "%"
		countArgs = append(countArgs, searchPattern, searchPattern, searchPattern)
	}

	if req.Status != "" {
		countQuery.WriteString(" AND c.status = ?")
		countArgs = append(countArgs, req.Status)
	}

	if req.Verified != nil {
		countQuery.WriteString(" AND c.ktp_verified = ?")
		countArgs = append(countArgs, *req.Verified)
	}

	if req.OwnerUserID != "" {
		countQuery.WriteString(" AND rc.owner_user_id = ?")
		countArgs = append(countArgs, req.OwnerUserID)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count customers: %v", err)
	}

	return &CustomerListResponse{
		Customers: customers,
		Total:     total,
		Page:      req.Page,
		Limit:     req.Limit,
	}, nil
}

func (s *CustomerService) DeleteCustomer(id string) error {
	customerID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid customer ID")
	}

	// Check if customer exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM customers WHERE id = ?", customerID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("customer not found")
		}
		return fmt.Errorf("failed to check customer existence: %v", err)
	}

	// Delete customer (cascade will handle related records)
	_, err = s.db.Exec("DELETE FROM customers WHERE id = ?", customerID.String())
	if err != nil {
		return fmt.Errorf("failed to delete customer: %v", err)
	}

	return nil
}

func (s *CustomerService) VerifyKTP(customerID, verifierUserID string) error {
	customerUUID, err := uuid.Parse(customerID)
	if err != nil {
		return fmt.Errorf("invalid customer ID")
	}

	verifierUUID, err := uuid.Parse(verifierUserID)
	if err != nil {
		return fmt.Errorf("invalid verifier ID")
	}

	// Update customer KTP verification status
	_, err = s.db.Exec(`
		UPDATE customers 
		SET ktp_verified = true, status = 'active'
		WHERE id = ?`, customerUUID.String())
	if err != nil {
		return fmt.Errorf("failed to verify customer KTP: %v", err)
	}

	// Update document verification status
	_, err = s.db.Exec(`
		UPDATE documents 
		SET status = 'verified', verified_by = ?, verified_at = datetime('now')
		WHERE customer_id = ? AND type = 'ktp'`,
		verifierUUID.String(), customerUUID.String())
	if err != nil {
		return fmt.Errorf("failed to verify document: %v", err)
	}

	return nil
}