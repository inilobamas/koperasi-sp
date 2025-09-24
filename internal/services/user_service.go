package services

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"github.com/google/uuid"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
	"koperasi-app/internal/utils"
)

type UserService struct {
	db *database.DB
}

func NewUserService(db *database.DB) *UserService {
	return &UserService{db: db}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	User  models.User `json:"user"`
	Token string      `json:"token"`
}

type UserCreateRequest struct {
	Email    string            `json:"email"`
	Name     string            `json:"name"`
	Role     models.UserRole   `json:"role"`
	Password string            `json:"password"`
}

type UserUpdateRequest struct {
	Name   string          `json:"name"`
	Role   models.UserRole `json:"role"`
	Active bool            `json:"active"`
}

type UserListRequest struct {
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
	Search string `json:"search"`
	Role   string `json:"role"`
	Active *bool  `json:"active"`
}

type UserListResponse struct {
	Users []models.User `json:"users"`
	Total int           `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}

type ChangePasswordRequest struct {
	UserID      string `json:"user_id"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (s *UserService) Login(req LoginRequest) (*LoginResponse, error) {
	// Validate required fields
	if err := utils.ValidateRequired(req.Email, "Email"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Password, "Password"); err != nil {
		return nil, err
	}

	// Validate email format
	if err := utils.ValidateEmail(req.Email); err != nil {
		return nil, err
	}

	// Find user by email
	var user models.User
	var hashedPassword string
	err := s.db.QueryRow(`
		SELECT id, email, name, role, active, created_at, updated_at, password_hash 
		FROM users WHERE email = ? AND active = true`,
		req.Email).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role, &user.Active,
		&user.CreatedAt, &user.UpdatedAt, &hashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("email atau password salah")
		}
		return nil, fmt.Errorf("failed to find user: %v", err)
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("email atau password salah")
	}

	// Generate session token
	token, err := s.generateSessionToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate session token: %v", err)
	}

	// Store session
	_, err = s.db.Exec(`
		INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		uuid.New().String(), user.ID.String(), token,
		time.Now().Add(24*time.Hour), time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	return &LoginResponse{
		User:  user,
		Token: token,
	}, nil
}

func (s *UserService) Logout(token string) error {
	if token == "" {
		return fmt.Errorf("token is required")
	}

	// Delete session
	_, err := s.db.Exec("DELETE FROM user_sessions WHERE token = ?", token)
	if err != nil {
		return fmt.Errorf("failed to delete session: %v", err)
	}

	return nil
}

func (s *UserService) ValidateSession(token string) (*models.User, error) {
	if token == "" {
		return nil, fmt.Errorf("token is required")
	}

	// Find active session
	var user models.User
	var expiresAt time.Time
	err := s.db.QueryRow(`
		SELECT u.id, u.email, u.name, u.role, u.active, u.created_at, u.updated_at, s.expires_at
		FROM users u
		JOIN user_sessions s ON u.id = s.user_id
		WHERE s.token = ? AND u.active = true`,
		token).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role, &user.Active,
		&user.CreatedAt, &user.UpdatedAt, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid or expired session")
		}
		return nil, fmt.Errorf("failed to validate session: %v", err)
	}

	// Check if session is expired
	if time.Now().After(expiresAt) {
		// Delete expired session
		s.db.Exec("DELETE FROM user_sessions WHERE token = ?", token)
		return nil, fmt.Errorf("session expired")
	}

	// Update session expiry
	_, err = s.db.Exec(`
		UPDATE user_sessions SET expires_at = ? WHERE token = ?`,
		time.Now().Add(24*time.Hour), token)
	if err != nil {
		return nil, fmt.Errorf("failed to update session: %v", err)
	}

	return &user, nil
}

func (s *UserService) CreateUser(req UserCreateRequest) (*models.User, error) {
	// Validate required fields
	if err := utils.ValidateRequired(req.Email, "Email"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Name, "Name"); err != nil {
		return nil, err
	}
	if err := utils.ValidateRequired(req.Password, "Password"); err != nil {
		return nil, err
	}

	// Validate email format
	if err := utils.ValidateEmail(req.Email); err != nil {
		return nil, err
	}

	// Validate password strength
	if len(req.Password) < 6 {
		return nil, fmt.Errorf("password harus minimal 6 karakter")
	}

	// Validate role
	validRoles := map[models.UserRole]bool{
		models.RoleSuperadmin: true,
		models.RoleAdmin:      true,
		models.RoleKaryawan:   true,
	}
	if !validRoles[req.Role] {
		return nil, fmt.Errorf("invalid role")
	}

	// Check if email already exists
	var existingID string
	err := s.db.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&existingID)
	if err != sql.ErrNoRows {
		if err == nil {
			return nil, fmt.Errorf("email sudah terdaftar")
		}
		return nil, fmt.Errorf("failed to check existing email: %v", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	user := &models.User{
		ID:        uuid.New(),
		Email:     req.Email,
		Name:      req.Name,
		Role:      req.Role,
		Active:    true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Insert user
	_, err = s.db.Exec(`
		INSERT INTO users (id, email, name, role, active, password_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID.String(), user.Email, user.Name, string(user.Role),
		user.Active, string(hashedPassword), user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	return user, nil
}

func (s *UserService) GetUser(id string) (*models.User, error) {
	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID")
	}

	var user models.User
	err = s.db.QueryRow(`
		SELECT id, email, name, role, active, created_at, updated_at
		FROM users WHERE id = ?`, userID.String()).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role,
		&user.Active, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	return &user, nil
}

func (s *UserService) UpdateUser(id string, req UserUpdateRequest) (*models.User, error) {
	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID")
	}

	// Validate required fields
	if err := utils.ValidateRequired(req.Name, "Name"); err != nil {
		return nil, err
	}

	// Validate role
	validRoles := map[models.UserRole]bool{
		models.RoleSuperadmin: true,
		models.RoleAdmin:      true,
		models.RoleKaryawan:   true,
	}
	if !validRoles[req.Role] {
		return nil, fmt.Errorf("invalid role")
	}

	// Check if user exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM users WHERE id = ?", userID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to check user existence: %v", err)
	}

	// Update user
	_, err = s.db.Exec(`
		UPDATE users SET name = ?, role = ?, active = ?, updated_at = ?
		WHERE id = ?`,
		req.Name, string(req.Role), req.Active, time.Now(), userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}

	return s.GetUser(id)
}

func (s *UserService) ListUsers(req UserListRequest) (*UserListResponse, error) {
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
		SELECT id, email, name, role, active, created_at, updated_at
		FROM users WHERE 1=1`)

	// Add search filter
	if req.Search != "" {
		queryBuilder.WriteString(" AND (name LIKE ? OR email LIKE ?)")
		searchPattern := "%" + req.Search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	// Add role filter
	if req.Role != "" {
		queryBuilder.WriteString(" AND role = ?")
		args = append(args, req.Role)
	}

	// Add active filter
	if req.Active != nil {
		queryBuilder.WriteString(" AND active = ?")
		args = append(args, *req.Active)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %v", err)
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Email, &user.Name, &user.Role,
			&user.Active, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %v", err)
		}
		users = append(users, user)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM users WHERE 1=1")

	if req.Search != "" {
		countQuery.WriteString(" AND (name LIKE ? OR email LIKE ?)")
		searchPattern := "%" + req.Search + "%"
		countArgs = append(countArgs, searchPattern, searchPattern)
	}

	if req.Role != "" {
		countQuery.WriteString(" AND role = ?")
		countArgs = append(countArgs, req.Role)
	}

	if req.Active != nil {
		countQuery.WriteString(" AND active = ?")
		countArgs = append(countArgs, *req.Active)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %v", err)
	}

	return &UserListResponse{
		Users: users,
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}

func (s *UserService) ChangePassword(req ChangePasswordRequest) error {
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return fmt.Errorf("invalid user ID")
	}

	// Validate required fields
	if err := utils.ValidateRequired(req.OldPassword, "Old Password"); err != nil {
		return err
	}
	if err := utils.ValidateRequired(req.NewPassword, "New Password"); err != nil {
		return err
	}

	// Validate new password strength
	if len(req.NewPassword) < 6 {
		return fmt.Errorf("password baru harus minimal 6 karakter")
	}

	// Get current password hash
	var currentHash string
	err = s.db.QueryRow("SELECT password_hash FROM users WHERE id = ?", userID.String()).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to get user password: %v", err)
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.OldPassword)); err != nil {
		return fmt.Errorf("password lama salah")
	}

	// Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %v", err)
	}

	// Update password
	_, err = s.db.Exec(`
		UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
		string(newHash), time.Now(), userID.String())
	if err != nil {
		return fmt.Errorf("failed to update password: %v", err)
	}

	// Invalidate all sessions for this user
	_, err = s.db.Exec("DELETE FROM user_sessions WHERE user_id = ?", userID.String())
	if err != nil {
		return fmt.Errorf("failed to invalidate sessions: %v", err)
	}

	return nil
}

func (s *UserService) DeleteUser(id string) error {
	userID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid user ID")
	}

	// Check if user exists
	var existingID string
	err = s.db.QueryRow("SELECT id FROM users WHERE id = ?", userID.String()).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to check user existence: %v", err)
	}

	// Delete user sessions first
	_, err = s.db.Exec("DELETE FROM user_sessions WHERE user_id = ?", userID.String())
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %v", err)
	}

	// Delete user (set inactive instead of actual deletion for audit trail)
	_, err = s.db.Exec("UPDATE users SET active = false, updated_at = ? WHERE id = ?", time.Now(), userID.String())
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %v", err)
	}

	return nil
}

func (s *UserService) generateSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", bytes), nil
}

func (s *UserService) CleanupExpiredSessions() error {
	_, err := s.db.Exec("DELETE FROM user_sessions WHERE expires_at < ?", time.Now())
	return err
}

func (s *UserService) GetKaryawanUsers() ([]models.User, error) {
	rows, err := s.db.Query(`
		SELECT id, email, name, role, active, created_at, updated_at
		FROM users 
		WHERE role = ? AND active = true
		ORDER BY name ASC`, string(models.RoleKaryawan))
	if err != nil {
		return nil, fmt.Errorf("failed to query karyawan users: %v", err)
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Email, &user.Name, &user.Role,
			&user.Active, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan karyawan user: %v", err)
		}
		users = append(users, user)
	}

	return users, nil
}