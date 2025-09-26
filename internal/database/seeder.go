package database

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"koperasi-app/internal/models"
	"koperasi-app/internal/utils"
)

type Seeder struct {
	db *DB
}

func NewSeeder(db *DB) *Seeder {
	return &Seeder{db: db}
}

func (s *Seeder) SeedAll() error {
	log.Println("Starting database seeding...")

	// Check if data already exists
	userCount, err := s.db.GetRowCount("users")
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}

	if userCount > 0 {
		log.Printf("Database already contains %d users. Skipping seeding to prevent duplicates.", userCount)
		log.Println("Use 'make db-reset && make seed' to reset and reseed the database.")
		return nil
	}

	if err := s.seedUsers(); err != nil {
		return fmt.Errorf("failed to seed users: %v", err)
	}

	if err := s.seedReferralCodes(); err != nil {
		return fmt.Errorf("failed to seed referral codes: %v", err)
	}

	if err := s.seedCustomers(); err != nil {
		return fmt.Errorf("failed to seed customers: %v", err)
	}

	if err := s.seedLoans(); err != nil {
		return fmt.Errorf("failed to seed loans: %v", err)
	}

	if err := s.seedNotificationTemplates(); err != nil {
		return fmt.Errorf("failed to seed notification templates: %v", err)
	}

	log.Println("Database seeding completed successfully")
	return nil
}

func (s *Seeder) seedUsers() error {
	type UserSeed struct {
		models.User
		Password string
	}

	users := []UserSeed{
		{
			User: models.User{
				ID:     uuid.New(),
				Email:  "superadmin@koperasi.com",
				Name:   "Super Administrator",
				Role:   models.RoleSuperadmin,
				Active: true,
			},
			Password: "superadmin123",
		},
		{
			User: models.User{
				ID:     uuid.New(),
				Email:  "admin@koperasi.com",
				Name:   "Administrator",
				Role:   models.RoleAdmin,
				Active: true,
			},
			Password: "admin123",
		},
	}

	// Add 8 more employees
	for i := 1; i <= 8; i++ {
		users = append(users, UserSeed{
			User: models.User{
				ID:     uuid.New(),
				Email:  fmt.Sprintf("karyawan%d@koperasi.com", i),
				Name:   fmt.Sprintf("Karyawan %d", i),
				Role:   models.RoleKaryawan,
				Active: true,
			},
			Password: "karyawan123",
		})
	}

	for _, userSeed := range users {
		// Hash the password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userSeed.Password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to hash password for %s: %v", userSeed.Email, err)
		}

		_, err = s.db.Exec(`
			INSERT INTO users (id, email, name, role, active, password_hash)
			VALUES (?, ?, ?, ?, ?, ?)`,
			userSeed.ID.String(), userSeed.Email, userSeed.Name, string(userSeed.Role), userSeed.Active, string(hashedPassword))
		if err != nil {
			return err
		}

		log.Printf("Created user: %s (%s) with password: %s", userSeed.Email, userSeed.Role, userSeed.Password)
	}

	log.Printf("Seeded %d users with password hashes", len(users))
	log.Println("\n=== USER CREDENTIALS ===")
	log.Println("Superadmin - Email: superadmin@koperasi.com, Password: superadmin123")
	log.Println("Admin - Email: admin@koperasi.com, Password: admin123")
	log.Println("Karyawan (all) - Password: karyawan123")
	return nil
}

func (s *Seeder) seedReferralCodes() error {
	// Get all users to create referral codes
	rows, err := s.db.Query("SELECT id FROM users")
	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return err
		}
		userIDs = append(userIDs, userID)
	}

	// Create 2-3 referral codes per user
	for _, userID := range userIDs {
		for i := 0; i < randomInt(2, 4); i++ {
			code := generateReferralCode()
			quota := randomInt(10, 100)
			used := randomInt(0, quota/3)
			
			expiresAt := time.Now().AddDate(1, 0, 0) // 1 year from now
			
			_, err := s.db.Exec(`
				INSERT INTO referral_codes (id, code, owner_user_id, quota, used, active, expires_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), code, userID, quota, used, true, expiresAt)
			if err != nil {
				return err
			}
		}
	}

	log.Println("Seeded referral codes")
	return nil
}

func (s *Seeder) seedCustomers() error {
	// Get referral codes from karyawan users specifically to ensure fair distribution
	rows, err := s.db.Query(`
		SELECT rc.id, u.email 
		FROM referral_codes rc 
		JOIN users u ON rc.owner_user_id = u.id 
		WHERE u.role = 'karyawan' 
		ORDER BY u.email`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type ReferralInfo struct {
		ID    string
		Email string
	}

	var referralCodes []ReferralInfo
	for rows.Next() {
		var info ReferralInfo
		if err := rows.Scan(&info.ID, &info.Email); err != nil {
			return err
		}
		referralCodes = append(referralCodes, info)
	}

	cities := []string{"Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Palembang", "Tangerang"}
	provinces := []string{"DKI Jakarta", "Jawa Timur", "Jawa Barat", "Sumatera Utara", "Jawa Tengah", "Sulawesi Selatan", "Sumatera Selatan", "Banten"}
	occupations := []string{"Karyawan Swasta", "Wiraswasta", "PNS", "TNI/Polri", "Guru", "Dokter", "Petani", "Buruh"}

	// Ensure we have referral codes to distribute
	if len(referralCodes) == 0 {
		log.Println("No karyawan referral codes found, creating customers without referral codes")
	}

	// Calculate customers per karyawan for fair distribution
	totalCustomers := 200
	customersWithReferral := int(float64(totalCustomers) * 0.85) // 85% get referral codes
	
	for i := 1; i <= totalCustomers; i++ {
		customer := models.Customer{
			ID:            uuid.New(),
			NIK:           generateNIK(),
			Name:          fmt.Sprintf("Customer %d", i),
			Email:         fmt.Sprintf("customer%d@email.com", i),
			Phone:         generatePhoneNumber(),
			DateOfBirth:   generateRandomDate(time.Date(1970, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)),
			Address:       fmt.Sprintf("Jalan Contoh No. %d", randomInt(1, 999)),
			City:          cities[randomInt(0, len(cities))],
			Province:      provinces[randomInt(0, len(provinces))],
			PostalCode:    fmt.Sprintf("%05d", randomInt(10000, 99999)),
			Occupation:    occupations[randomInt(0, len(occupations))],
			MonthlyIncome: int64(randomInt(3000000, 50000000)),
			Status:        models.CustomerStatusActive,
			KTPVerified:   randomBool(),
		}

		// Distribute customers fairly among karyawan referral codes
		if i <= customersWithReferral && len(referralCodes) > 0 {
			// Use round-robin distribution to ensure fair allocation
			referralIndex := (i - 1) % len(referralCodes)
			referralCodeID := referralCodes[referralIndex].ID
			
			customer.ReferralCodeID = &uuid.UUID{}
			if parsedUUID, err := uuid.Parse(referralCodeID); err == nil {
				customer.ReferralCodeID = &parsedUUID
			}
			
			// Log for first few assignments to verify distribution
			if i <= 10 {
				log.Printf("Customer %d assigned to %s (referral: %s)", i, referralCodes[referralIndex].Email, referralCodeID)
			}
		}

		// Encrypt sensitive data
		encryptedNIK, _ := utils.Encrypt(customer.NIK)
		encryptedEmail, _ := utils.Encrypt(customer.Email)
		encryptedPhone, _ := utils.Encrypt(customer.Phone)

		var referralCodeIDStr *string
		if customer.ReferralCodeID != nil {
			str := customer.ReferralCodeID.String()
			referralCodeIDStr = &str
		}

		_, err := s.db.Exec(`
			INSERT INTO customers (id, nik, name, email, phone, date_of_birth, address, city, province, postal_code, occupation, monthly_income, referral_code_id, status, ktp_verified)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			customer.ID.String(), encryptedNIK, customer.Name, encryptedEmail, encryptedPhone,
			customer.DateOfBirth, customer.Address, customer.City, customer.Province, customer.PostalCode,
			customer.Occupation, customer.MonthlyIncome, referralCodeIDStr, string(customer.Status), customer.KTPVerified)
		if err != nil {
			return err
		}
	}

	// Log final distribution summary
	if len(referralCodes) > 0 {
		customersPerKaryawan := customersWithReferral / len(referralCodes)
		remainder := customersWithReferral % len(referralCodes)
		log.Printf("Seeded 200 customers with fair distribution:")
		log.Printf("- %d customers have referral codes (85%%)", customersWithReferral)
		log.Printf("- Each of %d karyawan gets ~%d customers", len(referralCodes), customersPerKaryawan)
		if remainder > 0 {
			log.Printf("- First %d karyawan get 1 extra customer", remainder)
		}
		log.Printf("- karyawan1@koperasi.com is guaranteed to have customers")
	} else {
		log.Println("Seeded 200 customers without referral codes (no karyawan found)")
	}
	
	return nil
}

func (s *Seeder) seedLoans() error {
	// Get customers
	rows, err := s.db.Query("SELECT id FROM customers LIMIT 150")
	if err != nil {
		return err
	}
	defer rows.Close()

	var customerIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		customerIDs = append(customerIDs, id)
	}

	for i, customerID := range customerIDs {
		// 80% chance of having a loan
		if randomInt(1, 100) <= 80 {
			loan := models.Loan{
				ID:             uuid.New(),
				CustomerID:     uuid.MustParse(customerID),
				ContractNumber: fmt.Sprintf("KOP-%d-%04d", time.Now().Year(), i+1),
				Amount:         int64(randomInt(5000000, 100000000)),
				InterestRate:   float64(randomInt(10, 24)),
				Term:           randomInt(6, 36),
				Status:         models.LoanStatusActive,
				DisbursedAt:    timePtr(generateRandomDate(time.Now().AddDate(-2, 0, 0), time.Now().AddDate(-1, 0, 0))),
				DueDate:        generateRandomDate(time.Now().AddDate(0, 6, 0), time.Now().AddDate(3, 0, 0)),
			}

			// Calculate monthly payment (simple calculation)
			monthlyInterest := loan.InterestRate / 100 / 12
			loan.MonthlyPayment = int64(float64(loan.Amount) * monthlyInterest / (1 - 1/float64(1+monthlyInterest)*float64(loan.Term)))

			_, err := s.db.Exec(`
				INSERT INTO loans (id, customer_id, contract_number, amount, interest_rate, term, monthly_payment, status, disbursed_at, due_date)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				loan.ID.String(), loan.CustomerID.String(), loan.ContractNumber, loan.Amount, loan.InterestRate,
				loan.Term, loan.MonthlyPayment, string(loan.Status), loan.DisbursedAt, loan.DueDate)
			if err != nil {
				return err
			}

			// Create installments for this loan
			if err := s.seedInstallments(loan); err != nil {
				return err
			}
		}
	}

	log.Println("Seeded loans and installments")
	return nil
}

func (s *Seeder) seedInstallments(loan models.Loan) error {
	startDate := loan.DisbursedAt
	if startDate == nil {
		now := time.Now()
		startDate = &now
	}

	for i := 1; i <= loan.Term; i++ {
		dueDate := startDate.AddDate(0, i, 0)
		status := models.InstallmentStatusPending
		var paidAt *time.Time
		amountPaid := int64(0)
		dpd := 0

		// Simulate payment history - 70% paid on time, 20% overdue, 10% pending
		rand := randomInt(1, 100)
		if rand <= 70 && dueDate.Before(time.Now()) {
			status = models.InstallmentStatusPaid
			paidDate := generateRandomDate(dueDate.AddDate(0, 0, -5), dueDate.AddDate(0, 0, 2))
			paidAt = &paidDate
			amountPaid = loan.MonthlyPayment
		} else if rand <= 90 && dueDate.Before(time.Now()) {
			status = models.InstallmentStatusOverdue
			dpd = int(time.Since(dueDate).Hours() / 24)
		}

		installment := models.LoanInstallment{
			ID:         uuid.New(),
			LoanID:     loan.ID,
			Number:     i,
			DueDate:    dueDate,
			AmountDue:  loan.MonthlyPayment,
			AmountPaid: amountPaid,
			Status:     status,
			PaidAt:     paidAt,
			DPD:        dpd,
		}

		_, err := s.db.Exec(`
			INSERT INTO loan_installments (id, loan_id, number, due_date, amount_due, amount_paid, status, paid_at, dpd)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			installment.ID.String(), installment.LoanID.String(), installment.Number, installment.DueDate,
			installment.AmountDue, installment.AmountPaid, string(installment.Status), installment.PaidAt, installment.DPD)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *Seeder) seedNotificationTemplates() error {
	templates := []models.NotificationTemplate{
		{
			ID:           uuid.New(),
			Name:         "Reminder H-7 Email",
			Type:         models.NotificationTypeEmail,
			Subject:      "Reminder: Pembayaran Angsuran dalam 7 Hari",
			Body:         "Yth. {{.nama}},\n\nKami ingatkan bahwa pembayaran angsuran untuk kontrak {{.no_kontrak}} akan jatuh tempo pada {{.jatuh_tempo}} sebesar {{.jumlah}}.\n\nSilakan lakukan pembayaran melalui {{.link_pembayaran}}.\n\nHubungi CS kami di {{.kontak_cs}} jika ada pertanyaan.\n\nTerima kasih.",
			ScheduleType: models.ScheduleBeforeD7,
			Active:       true,
		},
		{
			ID:           uuid.New(),
			Name:         "Reminder H-3 WhatsApp",
			Type:         models.NotificationTypeWhatsApp,
			Subject:      "",
			Body:         "Hai {{.nama}}! 📅\n\nPembayaran angsuran kontrak {{.no_kontrak}} akan jatuh tempo dalam 3 hari ({{.jatuh_tempo}}) sebesar {{.jumlah}}.\n\n💳 Bayar: {{.link_pembayaran}}\n📞 CS: {{.kontak_cs}}",
			ScheduleType: models.ScheduleBeforeD3,
			Active:       true,
		},
		{
			ID:           uuid.New(),
			Name:         "Reminder H-1 Email",
			Type:         models.NotificationTypeEmail,
			Subject:      "Urgent: Pembayaran Angsuran Besok",
			Body:         "Yth. {{.nama}},\n\nPembayaran angsuran untuk kontrak {{.no_kontrak}} akan jatuh tempo BESOK ({{.jatuh_tempo}}) sebesar {{.jumlah}}.\n\nJangan lupa untuk melakukan pembayaran tepat waktu.\n\nBayar sekarang: {{.link_pembayaran}}\n\nTerima kasih.",
			ScheduleType: models.ScheduleBeforeD1,
			Active:       true,
		},
		{
			ID:           uuid.New(),
			Name:         "Overdue H+1 WhatsApp",
			Type:         models.NotificationTypeWhatsApp,
			Subject:      "",
			Body:         "⚠️ TERLAMBAT ⚠️\n\nHai {{.nama}}, pembayaran angsuran kontrak {{.no_kontrak}} telah jatuh tempo kemarin ({{.jatuh_tempo}}) sebesar {{.jumlah}}.\n\nSegera lakukan pembayaran untuk menghindari denda.\n\n💳 Bayar: {{.link_pembayaran}}\n📞 CS: {{.kontak_cs}}",
			ScheduleType: models.ScheduleAfterD1,
			Active:       true,
		},
		{
			ID:           uuid.New(),
			Name:         "Overdue H+3 Email",
			Type:         models.NotificationTypeEmail,
			Subject:      "TERLAMBAT: Segera Bayar Angsuran",
			Body:         "Yth. {{.nama}},\n\nPembayaran angsuran untuk kontrak {{.no_kontrak}} telah terlambat 3 hari (jatuh tempo: {{.jatuh_tempo}}) sebesar {{.jumlah}}.\n\nSegera lakukan pembayaran untuk menghindari denda dan konsekuensi lainnya.\n\nBayar sekarang: {{.link_pembayaran}}\n\nHubungi CS: {{.kontak_cs}}\n\nTerima kasih.",
			ScheduleType: models.ScheduleAfterD3,
			Active:       true,
		},
		{
			ID:           uuid.New(),
			Name:         "Overdue H+7 Final Warning",
			Type:         models.NotificationTypeEmail,
			Subject:      "PERINGATAN TERAKHIR: Pembayaran Angsuran",
			Body:         "Yth. {{.nama}},\n\nIni adalah peringatan terakhir untuk pembayaran angsuran kontrak {{.no_kontrak}} yang telah terlambat 7 hari (jatuh tempo: {{.jatuh_tempo}}) sebesar {{.jumlah}}.\n\nJika tidak ada pembayaran dalam 24 jam, kami akan mengambil tindakan lebih lanjut.\n\nBayar segera: {{.link_pembayaran}}\n\nHubungi CS: {{.kontak_cs}}\n\nTerima kasih.",
			ScheduleType: models.ScheduleAfterD7,
			Active:       true,
		},
	}

	for _, template := range templates {
		_, err := s.db.Exec(`
			INSERT INTO notification_templates (id, name, type, subject, body, schedule_type, active)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			template.ID.String(), template.Name, string(template.Type), template.Subject,
			template.Body, string(template.ScheduleType), template.Active)
		if err != nil {
			return err
		}
	}

	log.Printf("Seeded %d notification templates", len(templates))
	return nil
}

// Helper functions
func randomInt(min, max int) int {
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(max-min)))
	return min + int(n.Int64())
}

func randomBool() bool {
	return randomInt(0, 2) == 1
}

func generateNIK() string {
	return fmt.Sprintf("33%014d", randomInt(10000000000000, 99999999999999))
}

func generatePhoneNumber() string {
	prefixes := []string{"0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"}
	prefix := prefixes[randomInt(0, len(prefixes))]
	return fmt.Sprintf("%s%08d", prefix, randomInt(10000000, 99999999))
}

func generateReferralCode() string {
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 8)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		code[i] = chars[n.Int64()]
	}
	return string(code)
}

func generateRandomDate(start, end time.Time) time.Time {
	diff := end.Unix() - start.Unix()
	sec, _ := rand.Int(rand.Reader, big.NewInt(diff))
	return start.Add(time.Duration(sec.Int64()) * time.Second)
}

func timePtr(t time.Time) *time.Time {
	return &t
}