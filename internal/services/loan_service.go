package services

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
)

type LoanService struct {
	db *database.DB
}

func NewLoanService(db *database.DB) *LoanService {
	return &LoanService{db: db}
}

type LoanCreateRequest struct {
	CustomerID   string  `json:"customer_id"`
	Amount       int64   `json:"amount"`
	InterestRate float64 `json:"interest_rate"`
	Term         int     `json:"term"`
}

type LoanUpdateRequest struct {
	Amount       int64              `json:"amount"`
	InterestRate float64            `json:"interest_rate"`
	Term         int                `json:"term"`
	Status       models.LoanStatus  `json:"status"`
}

type LoanListRequest struct {
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
	CustomerID string `json:"customer_id"`
	Status     string `json:"status"`
}

type LoanListResponse struct {
	Loans []models.Loan `json:"loans"`
	Total int           `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}

type InstallmentPaymentRequest struct {
	InstallmentID string `json:"installment_id"`
	Amount        int64  `json:"amount"`
	PaymentDate   time.Time `json:"payment_date"`
}

func (s *LoanService) CreateLoan(req LoanCreateRequest) (*models.Loan, error) {
	// Validate customer exists
	customerUUID, err := uuid.Parse(req.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID")
	}

	var existingCustomerID string
	err = s.db.QueryRow("SELECT id FROM customers WHERE id = ?", customerUUID.String()).Scan(&existingCustomerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to check customer: %v", err)
	}

	// Validate loan parameters
	if req.Amount <= 0 {
		return nil, fmt.Errorf("loan amount must be greater than 0")
	}
	if req.InterestRate <= 0 || req.InterestRate > 100 {
		return nil, fmt.Errorf("interest rate must be between 0 and 100")
	}
	if req.Term <= 0 || req.Term > 60 {
		return nil, fmt.Errorf("loan term must be between 1 and 60 months")
	}

	// Check if customer already has an active loan
	var activeLoanCount int
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM loans 
		WHERE customer_id = ? AND status IN ('pending', 'approved', 'disbursed', 'active')`,
		customerUUID.String()).Scan(&activeLoanCount)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing loans: %v", err)
	}
	if activeLoanCount > 0 {
		return nil, fmt.Errorf("customer already has an active loan")
	}

	// Generate contract number
	contractNumber, err := s.generateContractNumber()
	if err != nil {
		return nil, fmt.Errorf("failed to generate contract number: %v", err)
	}

	// Calculate monthly payment using PMT formula
	monthlyPayment := s.calculateMonthlyPayment(req.Amount, req.InterestRate, req.Term)

	// Calculate due date (term months from now)
	dueDate := time.Now().AddDate(0, req.Term, 0)

	loan := &models.Loan{
		ID:             uuid.New(),
		CustomerID:     customerUUID,
		ContractNumber: contractNumber,
		Amount:         req.Amount,
		InterestRate:   req.InterestRate,
		Term:           req.Term,
		MonthlyPayment: monthlyPayment,
		Status:         models.LoanStatusPending,
		DueDate:        dueDate,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Insert loan
	_, err = s.db.Exec(`
		INSERT INTO loans (id, customer_id, contract_number, amount, interest_rate, term, monthly_payment, status, due_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		loan.ID.String(), loan.CustomerID.String(), loan.ContractNumber,
		loan.Amount, loan.InterestRate, loan.Term, loan.MonthlyPayment,
		string(loan.Status), loan.DueDate)
	if err != nil {
		return nil, fmt.Errorf("failed to insert loan: %v", err)
	}

	return loan, nil
}

func (s *LoanService) GetLoan(id string) (*models.Loan, error) {
	loanID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid loan ID")
	}

	var loan models.Loan
	var customerName string

	err = s.db.QueryRow(`
		SELECT l.id, l.customer_id, l.contract_number, l.amount, l.interest_rate, l.term,
		       l.monthly_payment, l.status, l.disbursed_at, l.due_date, l.created_at, l.updated_at,
		       c.name as customer_name
		FROM loans l
		JOIN customers c ON l.customer_id = c.id
		WHERE l.id = ?`, loanID.String()).Scan(
		&loan.ID, &loan.CustomerID, &loan.ContractNumber, &loan.Amount,
		&loan.InterestRate, &loan.Term, &loan.MonthlyPayment, &loan.Status,
		&loan.DisbursedAt, &loan.DueDate, &loan.CreatedAt, &loan.UpdatedAt,
		&customerName)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("loan not found")
		}
		return nil, fmt.Errorf("failed to get loan: %v", err)
	}

	// Set customer info
	loan.Customer = &models.Customer{
		ID:   loan.CustomerID,
		Name: customerName,
	}

	// Get installments
	installments, err := s.getInstallmentsByLoanID(loan.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get installments: %v", err)
	}
	loan.Installments = installments

	return &loan, nil
}

func (s *LoanService) UpdateLoan(id string, req LoanUpdateRequest) (*models.Loan, error) {
	loanID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid loan ID")
	}

	// Validate loan parameters
	if req.Amount <= 0 {
		return nil, fmt.Errorf("loan amount must be greater than 0")
	}
	if req.InterestRate <= 0 || req.InterestRate > 100 {
		return nil, fmt.Errorf("interest rate must be between 0 and 100")
	}
	if req.Term <= 0 || req.Term > 60 {
		return nil, fmt.Errorf("loan term must be between 1 and 60 months")
	}

	// Check if loan exists
	var existingStatus string
	err = s.db.QueryRow("SELECT status FROM loans WHERE id = ?", loanID.String()).Scan(&existingStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("loan not found")
		}
		return nil, fmt.Errorf("failed to check loan existence: %v", err)
	}

	// Don't allow updates to disbursed or active loans
	if existingStatus == string(models.LoanStatusDisbursed) || existingStatus == string(models.LoanStatusActive) {
		return nil, fmt.Errorf("cannot update disbursed or active loans")
	}

	// Calculate new monthly payment
	monthlyPayment := s.calculateMonthlyPayment(req.Amount, req.InterestRate, req.Term)

	// Calculate new due date
	dueDate := time.Now().AddDate(0, req.Term, 0)

	// Update loan
	_, err = s.db.Exec(`
		UPDATE loans 
		SET amount = ?, interest_rate = ?, term = ?, monthly_payment = ?, status = ?, due_date = ?
		WHERE id = ?`,
		req.Amount, req.InterestRate, req.Term, monthlyPayment, string(req.Status), dueDate, loanID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update loan: %v", err)
	}

	return s.GetLoan(id)
}

func (s *LoanService) ListLoans(req LoanListRequest) (*LoanListResponse, error) {
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
		SELECT l.id, l.customer_id, l.contract_number, l.amount, l.interest_rate, l.term,
		       l.monthly_payment, l.status, l.disbursed_at, l.due_date, l.created_at, l.updated_at,
		       c.name as customer_name
		FROM loans l
		JOIN customers c ON l.customer_id = c.id
		WHERE 1=1`)

	// Add customer filter
	if req.CustomerID != "" {
		queryBuilder.WriteString(" AND l.customer_id = ?")
		args = append(args, req.CustomerID)
	}

	// Add status filter
	if req.Status != "" {
		queryBuilder.WriteString(" AND l.status = ?")
		args = append(args, req.Status)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY l.created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query loans: %v", err)
	}
	defer rows.Close()

	loans := make([]models.Loan, 0)
	for rows.Next() {
		var loan models.Loan
		var customerName string

		err := rows.Scan(
			&loan.ID, &loan.CustomerID, &loan.ContractNumber, &loan.Amount,
			&loan.InterestRate, &loan.Term, &loan.MonthlyPayment, &loan.Status,
			&loan.DisbursedAt, &loan.DueDate, &loan.CreatedAt, &loan.UpdatedAt,
			&customerName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan loan: %v", err)
		}

		// Set customer info
		loan.Customer = &models.Customer{
			ID:   loan.CustomerID,
			Name: customerName,
		}

		loans = append(loans, loan)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM loans l WHERE 1=1")

	if req.CustomerID != "" {
		countQuery.WriteString(" AND l.customer_id = ?")
		countArgs = append(countArgs, req.CustomerID)
	}

	if req.Status != "" {
		countQuery.WriteString(" AND l.status = ?")
		countArgs = append(countArgs, req.Status)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count loans: %v", err)
	}

	return &LoanListResponse{
		Loans: loans,
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}

func (s *LoanService) DisburseLoan(id string) (*models.Loan, error) {
	loanID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid loan ID")
	}

	// Check loan status
	var currentStatus string
	var amount int64
	var term int
	err = s.db.QueryRow("SELECT status, amount, term FROM loans WHERE id = ?", loanID.String()).Scan(&currentStatus, &amount, &term)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("loan not found")
		}
		return nil, fmt.Errorf("failed to check loan: %v", err)
	}

	if currentStatus != string(models.LoanStatusApproved) {
		return nil, fmt.Errorf("only approved loans can be disbursed")
	}

	// Begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// Update loan status
	now := time.Now()
	_, err = tx.Exec(`
		UPDATE loans 
		SET status = ?, disbursed_at = ?
		WHERE id = ?`,
		string(models.LoanStatusDisbursed), now, loanID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update loan status: %v", err)
	}

	// Create installments
	err = s.createInstallments(tx, loanID, amount, term, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create installments: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %v", err)
	}

	return s.GetLoan(id)
}

func (s *LoanService) PayInstallment(req InstallmentPaymentRequest) (*models.LoanInstallment, error) {
	installmentID, err := uuid.Parse(req.InstallmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid installment ID")
	}

	if req.Amount <= 0 {
		return nil, fmt.Errorf("payment amount must be greater than 0")
	}

	// Get installment details
	var installment models.LoanInstallment
	var currentAmountPaid int64
	err = s.db.QueryRow(`
		SELECT id, loan_id, number, due_date, amount_due, amount_paid, status, paid_at, dpd
		FROM loan_installments 
		WHERE id = ?`, installmentID.String()).Scan(
		&installment.ID, &installment.LoanID, &installment.Number,
		&installment.DueDate, &installment.AmountDue, &currentAmountPaid,
		&installment.Status, &installment.PaidAt, &installment.DPD)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("installment not found")
		}
		return nil, fmt.Errorf("failed to get installment: %v", err)
	}

	// Calculate new amount paid
	newAmountPaid := currentAmountPaid + req.Amount
	
	// Determine new status
	var newStatus models.LoanInstallmentStatus
	var paidAt *time.Time
	
	if newAmountPaid >= installment.AmountDue {
		newStatus = models.InstallmentStatusPaid
		paidAt = &req.PaymentDate
	} else {
		newStatus = models.InstallmentStatusPartial
	}

	// Update installment
	_, err = s.db.Exec(`
		UPDATE loan_installments 
		SET amount_paid = ?, status = ?, paid_at = ?, dpd = 0
		WHERE id = ?`,
		newAmountPaid, string(newStatus), paidAt, installmentID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update installment: %v", err)
	}

	// If all installments are paid, update loan status
	if newStatus == models.InstallmentStatusPaid {
		var unpaidCount int
		err = s.db.QueryRow(`
			SELECT COUNT(*) FROM loan_installments 
			WHERE loan_id = ? AND status != 'paid'`,
			installment.LoanID.String()).Scan(&unpaidCount)
		if err == nil && unpaidCount == 0 {
			_, err = s.db.Exec(`
				UPDATE loans SET status = ? WHERE id = ?`,
				string(models.LoanStatusCompleted), installment.LoanID.String())
		}
	}

	// Return updated installment
	installment.AmountPaid = newAmountPaid
	installment.Status = newStatus
	installment.PaidAt = paidAt
	installment.DPD = 0

	return &installment, nil
}

// Helper functions

func (s *LoanService) calculateMonthlyPayment(amount int64, interestRate float64, term int) int64 {
	// Convert to float for calculation
	principal := float64(amount)
	monthlyRate := interestRate / 100 / 12
	numPayments := float64(term)

	// PMT formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
	if monthlyRate == 0 {
		return int64(principal / numPayments)
	}

	monthlyPayment := principal * (monthlyRate * math.Pow(1+monthlyRate, numPayments)) / (math.Pow(1+monthlyRate, numPayments) - 1)
	
	return int64(math.Round(monthlyPayment))
}

func (s *LoanService) generateContractNumber() (string, error) {
	year := time.Now().Year()
	
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM loans WHERE strftime('%Y', created_at) = ?", fmt.Sprintf("%d", year)).Scan(&count)
	if err != nil {
		return "", err
	}
	
	return fmt.Sprintf("KOP-%d-%04d", year, count+1), nil
}

func (s *LoanService) createInstallments(tx *sql.Tx, loanID uuid.UUID, amount int64, term int, disbursedAt time.Time) error {
	monthlyPayment := s.calculateMonthlyPayment(amount, 12.0, term) // Example rate for calculation
	
	for i := 1; i <= term; i++ {
		dueDate := disbursedAt.AddDate(0, i, 0)
		
		installment := models.LoanInstallment{
			ID:         uuid.New(),
			LoanID:     loanID,
			Number:     i,
			DueDate:    dueDate,
			AmountDue:  monthlyPayment,
			AmountPaid: 0,
			Status:     models.InstallmentStatusPending,
			DPD:        0,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		
		_, err := tx.Exec(`
			INSERT INTO loan_installments (id, loan_id, number, due_date, amount_due, amount_paid, status, dpd)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			installment.ID.String(), installment.LoanID.String(), installment.Number,
			installment.DueDate, installment.AmountDue, installment.AmountPaid,
			string(installment.Status), installment.DPD)
		if err != nil {
			return err
		}
	}
	
	return nil
}

func (s *LoanService) getInstallmentsByLoanID(loanID string) ([]models.LoanInstallment, error) {
	rows, err := s.db.Query(`
		SELECT id, loan_id, number, due_date, amount_due, amount_paid, status, paid_at, dpd, created_at, updated_at
		FROM loan_installments 
		WHERE loan_id = ? 
		ORDER BY number`, loanID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	installments := make([]models.LoanInstallment, 0)
	for rows.Next() {
		var installment models.LoanInstallment
		
		err := rows.Scan(
			&installment.ID, &installment.LoanID, &installment.Number,
			&installment.DueDate, &installment.AmountDue, &installment.AmountPaid,
			&installment.Status, &installment.PaidAt, &installment.DPD,
			&installment.CreatedAt, &installment.UpdatedAt)
		if err != nil {
			return nil, err
		}
		
		installments = append(installments, installment)
	}
	
	return installments, nil
}

func (s *LoanService) GetOverdueInstallments() ([]models.LoanInstallment, error) {
	rows, err := s.db.Query(`
		SELECT li.id, li.loan_id, li.number, li.due_date, li.amount_due, li.amount_paid, 
		       li.status, li.paid_at, li.dpd, li.created_at, li.updated_at,
		       l.contract_number, c.name as customer_name
		FROM loan_installments li
		JOIN loans l ON li.loan_id = l.id
		JOIN customers c ON l.customer_id = c.id
		WHERE li.due_date < date('now') AND li.status != 'paid'
		ORDER BY li.due_date ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query overdue installments: %v", err)
	}
	defer rows.Close()

	installments := make([]models.LoanInstallment, 0)
	for rows.Next() {
		var installment models.LoanInstallment
		var contractNumber, customerName string

		err := rows.Scan(
			&installment.ID, &installment.LoanID, &installment.Number,
			&installment.DueDate, &installment.AmountDue, &installment.AmountPaid,
			&installment.Status, &installment.PaidAt, &installment.DPD,
			&installment.CreatedAt, &installment.UpdatedAt,
			&contractNumber, &customerName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan installment: %v", err)
		}

		// Calculate DPD (Days Past Due)
		if installment.DueDate.Before(time.Now()) {
			installment.DPD = int(time.Since(installment.DueDate).Hours() / 24)
		}

		// Update DPD in database
		s.db.Exec("UPDATE loan_installments SET dpd = ? WHERE id = ?", installment.DPD, installment.ID.String())

		// Set loan and customer info
		installment.Loan = &models.Loan{
			ID:             installment.LoanID,
			ContractNumber: contractNumber,
		}
		installment.Loan.Customer = &models.Customer{
			Name: customerName,
		}

		installments = append(installments, installment)
	}

	return installments, nil
}