package services

import (
	"crypto/sha256"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
	"koperasi-app/internal/models"
)

type DocumentService struct {
	db  *database.DB
	cfg *config.Config
}

func NewDocumentService(db *database.DB, cfg *config.Config) *DocumentService {
	return &DocumentService{db: db, cfg: cfg}
}

type DocumentUploadRequest struct {
	CustomerID string                `json:"customer_id"`
	Type       string                `json:"type"`
	File       *multipart.FileHeader `json:"file"`
}

type DocumentListRequest struct {
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
	CustomerID string `json:"customer_id"`
	Type       string `json:"type"`
	Status     string `json:"status"`
}

type DocumentListResponse struct {
	Documents []models.Document `json:"documents"`
	Total     int               `json:"total"`
	Page      int               `json:"page"`
	Limit     int               `json:"limit"`
}

type DocumentVerifyRequest struct {
	DocumentID string `json:"document_id"`
	VerifierID string `json:"verifier_id"`
	Status     string `json:"status"`
	Notes      string `json:"notes"`
}

var allowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/webp": true,
	"application/pdf": true,
}

var maxFileSize int64 = 10 * 1024 * 1024 // 10MB

func (s *DocumentService) UploadDocument(req DocumentUploadRequest, fileContent io.Reader) (*models.Document, error) {
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

	// Validate document type
	validTypes := map[string]bool{
		string(models.DocumentTypeKTP):  true,
		string(models.DocumentTypeKK):   true,
		string(models.DocumentTypeSIM):  true,
		string(models.DocumentTypeNPWP): true,
	}
	if !validTypes[req.Type] {
		return nil, fmt.Errorf("invalid document type")
	}

	// Validate file
	if req.File == nil {
		return nil, fmt.Errorf("no file provided")
	}

	// Check file size
	if req.File.Size > maxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum limit of 10MB")
	}

	// Check MIME type
	contentType := req.File.Header.Get("Content-Type")
	if !allowedMimeTypes[contentType] {
		return nil, fmt.Errorf("invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed")
	}

	// Check if customer already has a document of this type
	var existingDocID string
	err = s.db.QueryRow("SELECT id FROM documents WHERE customer_id = ? AND type = ?", customerUUID.String(), req.Type).Scan(&existingDocID)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing document: %v", err)
	}
	if err == nil {
		return nil, fmt.Errorf("customer already has a %s document", req.Type)
	}

	// Generate unique filename
	ext := filepath.Ext(req.File.Filename)
	filename := fmt.Sprintf("%s_%s_%d%s", req.CustomerID, req.Type, time.Now().Unix(), ext)
	
	// Ensure documents directory exists
	documentsDir := s.cfg.Storage.DocumentsPath
	if err := os.MkdirAll(documentsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create documents directory: %v", err)
	}

	// Full file path
	filePath := filepath.Join(documentsDir, filename)

	// Copy file content to destination
	destFile, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %v", err)
	}
	defer destFile.Close()

	// Calculate file hash while copying
	hash := sha256.New()
	multiWriter := io.MultiWriter(destFile, hash)

	writtenBytes, err := io.Copy(multiWriter, fileContent)
	if err != nil {
		os.Remove(filePath) // Cleanup on error
		return nil, fmt.Errorf("failed to write file: %v", err)
	}

	if writtenBytes != req.File.Size {
		os.Remove(filePath) // Cleanup on error
		return nil, fmt.Errorf("file size mismatch")
	}

	// Create document record
	document := &models.Document{
		ID:           uuid.New(),
		CustomerID:   customerUUID,
		Type:         models.DocumentType(req.Type),
		Filename:     filename,
		OriginalName: req.File.Filename,
		Path:         filePath,
		Size:         req.File.Size,
		MimeType:     contentType,
		Status:       models.DocumentStatusPending,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Insert document record
	_, err = s.db.Exec(`
		INSERT INTO documents (id, customer_id, type, filename, original_name, path, size, mime_type, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		document.ID.String(), document.CustomerID.String(), string(document.Type),
		document.Filename, document.OriginalName, document.Path, document.Size,
		document.MimeType, string(document.Status))
	if err != nil {
		os.Remove(filePath) // Cleanup on error
		return nil, fmt.Errorf("failed to insert document record: %v", err)
	}

	return document, nil
}

func (s *DocumentService) GetDocument(id string) (*models.Document, error) {
	documentID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid document ID")
	}

	var document models.Document
	var verifiedByStr *string
	
	err = s.db.QueryRow(`
		SELECT d.id, d.customer_id, d.type, d.filename, d.original_name, d.path, d.size, d.mime_type,
		       d.status, d.verified_by, d.verified_at, d.notes, d.created_at, d.updated_at,
		       c.name as customer_name
		FROM documents d
		JOIN customers c ON d.customer_id = c.id
		WHERE d.id = ?`, documentID.String()).Scan(
		&document.ID, &document.CustomerID, &document.Type, &document.Filename,
		&document.OriginalName, &document.Path, &document.Size, &document.MimeType,
		&document.Status, &verifiedByStr, &document.VerifiedAt, &document.Notes,
		&document.CreatedAt, &document.UpdatedAt, &document.Customer.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %v", err)
	}

	// Parse verified_by if present
	if verifiedByStr != nil {
		if parsedUUID, err := uuid.Parse(*verifiedByStr); err == nil {
			document.VerifiedBy = &parsedUUID
		}
	}

	// Initialize customer if needed
	if document.Customer == nil {
		document.Customer = &models.Customer{
			ID: document.CustomerID,
		}
	}

	return &document, nil
}

func (s *DocumentService) ListDocuments(req DocumentListRequest) (*DocumentListResponse, error) {
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
		SELECT d.id, d.customer_id, d.type, d.filename, d.original_name, d.path, d.size, d.mime_type,
		       d.status, d.verified_by, d.verified_at, d.notes, d.created_at, d.updated_at,
		       c.name as customer_name
		FROM documents d
		JOIN customers c ON d.customer_id = c.id
		WHERE 1=1`)

	// Add customer filter
	if req.CustomerID != "" {
		queryBuilder.WriteString(" AND d.customer_id = ?")
		args = append(args, req.CustomerID)
	}

	// Add type filter
	if req.Type != "" {
		queryBuilder.WriteString(" AND d.type = ?")
		args = append(args, req.Type)
	}

	// Add status filter
	if req.Status != "" {
		queryBuilder.WriteString(" AND d.status = ?")
		args = append(args, req.Status)
	}

	// Add ordering and pagination
	queryBuilder.WriteString(" ORDER BY d.created_at DESC LIMIT ? OFFSET ?")
	args = append(args, req.Limit, offset)

	// Execute query
	rows, err := s.db.Query(queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query documents: %v", err)
	}
	defer rows.Close()

	documents := make([]models.Document, 0)
	for rows.Next() {
		var document models.Document
		var verifiedByStr *string
		var customerName string

		err := rows.Scan(
			&document.ID, &document.CustomerID, &document.Type, &document.Filename,
			&document.OriginalName, &document.Path, &document.Size, &document.MimeType,
			&document.Status, &verifiedByStr, &document.VerifiedAt, &document.Notes,
			&document.CreatedAt, &document.UpdatedAt, &customerName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan document: %v", err)
		}

		// Parse verified_by if present
		if verifiedByStr != nil {
			if parsedUUID, err := uuid.Parse(*verifiedByStr); err == nil {
				document.VerifiedBy = &parsedUUID
			}
		}

		// Set customer info
		document.Customer = &models.Customer{
			ID:   document.CustomerID,
			Name: customerName,
		}

		documents = append(documents, document)
	}

	// Get total count
	countQuery := strings.Builder{}
	countArgs := make([]interface{}, 0)

	countQuery.WriteString("SELECT COUNT(*) FROM documents d WHERE 1=1")

	if req.CustomerID != "" {
		countQuery.WriteString(" AND d.customer_id = ?")
		countArgs = append(countArgs, req.CustomerID)
	}

	if req.Type != "" {
		countQuery.WriteString(" AND d.type = ?")
		countArgs = append(countArgs, req.Type)
	}

	if req.Status != "" {
		countQuery.WriteString(" AND d.status = ?")
		countArgs = append(countArgs, req.Status)
	}

	var total int
	err = s.db.QueryRow(countQuery.String(), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count documents: %v", err)
	}

	return &DocumentListResponse{
		Documents: documents,
		Total:     total,
		Page:      req.Page,
		Limit:     req.Limit,
	}, nil
}

func (s *DocumentService) VerifyDocument(req DocumentVerifyRequest) (*models.Document, error) {
	documentUUID, err := uuid.Parse(req.DocumentID)
	if err != nil {
		return nil, fmt.Errorf("invalid document ID")
	}

	verifierUUID, err := uuid.Parse(req.VerifierID)
	if err != nil {
		return nil, fmt.Errorf("invalid verifier ID")
	}

	// Validate status
	if req.Status != string(models.DocumentStatusVerified) && req.Status != string(models.DocumentStatusRejected) {
		return nil, fmt.Errorf("invalid status")
	}

	// Check if document exists
	var existingDocID string
	err = s.db.QueryRow("SELECT id FROM documents WHERE id = ?", documentUUID.String()).Scan(&existingDocID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to check document existence: %v", err)
	}

	// Update document
	_, err = s.db.Exec(`
		UPDATE documents 
		SET status = ?, verified_by = ?, verified_at = datetime('now'), notes = ?
		WHERE id = ?`,
		req.Status, verifierUUID.String(), req.Notes, documentUUID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to update document: %v", err)
	}

	// If verified, also update customer status
	if req.Status == string(models.DocumentStatusVerified) {
		// Get customer ID from document
		var customerID string
		err = s.db.QueryRow("SELECT customer_id FROM documents WHERE id = ?", documentUUID.String()).Scan(&customerID)
		if err != nil {
			return nil, fmt.Errorf("failed to get customer ID: %v", err)
		}

		// Update customer verification status
		_, err = s.db.Exec(`
			UPDATE customers 
			SET ktp_verified = true, status = 'active'
			WHERE id = ?`, customerID)
		if err != nil {
			return nil, fmt.Errorf("failed to update customer verification: %v", err)
		}
	}

	return s.GetDocument(req.DocumentID)
}

func (s *DocumentService) DeleteDocument(id string) error {
	documentUUID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid document ID")
	}

	// Get document info before deletion
	var filePath string
	err = s.db.QueryRow("SELECT path FROM documents WHERE id = ?", documentUUID.String()).Scan(&filePath)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("document not found")
		}
		return fmt.Errorf("failed to get document path: %v", err)
	}

	// Delete file from filesystem
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %v", err)
	}

	// Delete document record
	_, err = s.db.Exec("DELETE FROM documents WHERE id = ?", documentUUID.String())
	if err != nil {
		return fmt.Errorf("failed to delete document record: %v", err)
	}

	return nil
}

func (s *DocumentService) GetDocumentFile(id string) (string, error) {
	documentUUID, err := uuid.Parse(id)
	if err != nil {
		return "", fmt.Errorf("invalid document ID")
	}

	var filePath string
	err = s.db.QueryRow("SELECT path FROM documents WHERE id = ?", documentUUID.String()).Scan(&filePath)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("document not found")
		}
		return "", fmt.Errorf("failed to get document path: %v", err)
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", fmt.Errorf("document file not found on disk")
	}

	return filePath, nil
}

func (s *DocumentService) GetPendingDocuments() ([]models.Document, error) {
	rows, err := s.db.Query(`
		SELECT d.id, d.customer_id, d.type, d.filename, d.original_name, d.path, d.size, d.mime_type,
		       d.status, d.verified_by, d.verified_at, d.notes, d.created_at, d.updated_at,
		       c.name as customer_name
		FROM documents d
		JOIN customers c ON d.customer_id = c.id
		WHERE d.status = 'pending'
		ORDER BY d.created_at ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending documents: %v", err)
	}
	defer rows.Close()

	documents := make([]models.Document, 0)
	for rows.Next() {
		var document models.Document
		var verifiedByStr *string
		var customerName string

		err := rows.Scan(
			&document.ID, &document.CustomerID, &document.Type, &document.Filename,
			&document.OriginalName, &document.Path, &document.Size, &document.MimeType,
			&document.Status, &verifiedByStr, &document.VerifiedAt, &document.Notes,
			&document.CreatedAt, &document.UpdatedAt, &customerName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan document: %v", err)
		}

		// Set customer info
		document.Customer = &models.Customer{
			ID:   document.CustomerID,
			Name: customerName,
		}

		documents = append(documents, document)
	}

	return documents, nil
}