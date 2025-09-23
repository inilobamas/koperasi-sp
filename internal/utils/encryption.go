package utils

import (
	"encoding/base64"
	"fmt"
	"io"

	"filippo.io/age"
)

var (
	// This should be loaded from config in production
	// For demo purposes, using a static key
	encryptionIdentity *age.X25519Identity
)

func init() {
	// Generate a new identity for demo purposes
	// In production, this should be loaded from secure configuration
	identity, err := age.GenerateX25519Identity()
	if err != nil {
		panic(fmt.Sprintf("Failed to generate encryption identity: %v", err))
	}
	encryptionIdentity = identity
}

// Encrypt encrypts plaintext using age encryption
func Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	recipient := encryptionIdentity.Recipient()
	
	// Create a buffer to hold the encrypted data
	var encrypted []byte
	w := &writeBuffer{buf: &encrypted}
	
	ageWriter, err := age.Encrypt(w, recipient)
	if err != nil {
		return "", fmt.Errorf("failed to create age writer: %v", err)
	}

	if _, err := ageWriter.Write([]byte(plaintext)); err != nil {
		return "", fmt.Errorf("failed to write plaintext: %v", err)
	}

	if err := ageWriter.Close(); err != nil {
		return "", fmt.Errorf("failed to close age writer: %v", err)
	}

	return base64.StdEncoding.EncodeToString(encrypted), nil
}

// Decrypt decrypts ciphertext using age decryption
func Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	encrypted, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %v", err)
	}

	r := &readBuffer{buf: encrypted}
	ageReader, err := age.Decrypt(r, encryptionIdentity)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %v", err)
	}

	plaintext, err := io.ReadAll(ageReader)
	if err != nil {
		return "", fmt.Errorf("failed to read decrypted data: %v", err)
	}

	return string(plaintext), nil
}

// MaskNIK masks NIK for display (shows only last 4 digits)
func MaskNIK(nik string) string {
	if len(nik) < 4 {
		return "****"
	}
	return "************" + nik[len(nik)-4:]
}

// MaskPhone masks phone number for display
func MaskPhone(phone string) string {
	if len(phone) < 4 {
		return "****"
	}
	return phone[:4] + "****" + phone[len(phone)-2:]
}

// MaskEmail masks email for display
func MaskEmail(email string) string {
	at := len(email)
	for i := len(email) - 1; i >= 0; i-- {
		if email[i] == '@' {
			at = i
			break
		}
	}
	
	if at == len(email) || at < 2 {
		return "****"
	}
	
	return email[:2] + "****" + email[at:]
}

// Helper types for age encryption
type writeBuffer struct {
	buf *[]byte
}

func (w *writeBuffer) Write(p []byte) (n int, err error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

type readBuffer struct {
	buf []byte
	pos int
}

func (r *readBuffer) Read(p []byte) (n int, err error) {
	if r.pos >= len(r.buf) {
		return 0, io.EOF
	}
	
	n = copy(p, r.buf[r.pos:])
	r.pos += n
	return n, nil
}