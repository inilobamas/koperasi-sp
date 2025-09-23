package test

import (
	"testing"

	"koperasi-app/internal/utils"
)

func TestNIKValidation(t *testing.T) {
	validNIKs := []string{
		"3374010101851234", // Valid NIK: 33 (Jateng) 74 (Semarang) 01 (day) 01 (month) 85 (year) 1234
		"3301020208654321", // Valid NIK: 33 (Jateng) 01 (Cilacap) 02 (day) 02 (month) 08 (year) 4321
	}

	invalidNIKs := []string{
		"123456789012345",   // Too short
		"12345678901234567", // Too long
		"abcd011234567890",  // Contains letters
		"3374991234567890",  // Invalid month (99)
		"3374003234567890",  // Invalid day (32)
	}

	for _, nik := range validNIKs {
		if err := utils.ValidateNIK(nik); err != nil {
			t.Logf("NIK %s: day=%s, month=%s, year=%s", nik, nik[6:8], nik[8:10], nik[10:12])
			t.Errorf("Expected NIK %s to be valid, got error: %v", nik, err)
		}
	}

	for _, nik := range invalidNIKs {
		if err := utils.ValidateNIK(nik); err == nil {
			t.Errorf("Expected NIK %s to be invalid, but it passed validation", nik)
		}
	}
}

func TestPhoneValidation(t *testing.T) {
	validPhones := []string{
		"081234567890",
		"0812-3456-7890",
		"0813 1234 5678",
		"+6281234567890",
		"6281234567890",
	}

	invalidPhones := []string{
		"123456789",     // Too short
		"081234567890123", // Too long
		"071234567890",  // Invalid prefix
		"08123456789a",  // Contains letters
	}

	for _, phone := range validPhones {
		if err := utils.ValidateIndonesianPhone(phone); err != nil {
			t.Errorf("Expected phone %s to be valid, got error: %v", phone, err)
		}
	}

	for _, phone := range invalidPhones {
		if err := utils.ValidateIndonesianPhone(phone); err == nil {
			t.Errorf("Expected phone %s to be invalid, but it passed validation", phone)
		}
	}
}

func TestEmailValidation(t *testing.T) {
	validEmails := []string{
		"test@example.com",
		"user.name@domain.co.id",
		"123@gmail.com",
	}

	invalidEmails := []string{
		"invalid-email",
		"@example.com",
		"test@",
		"test.example.com",
	}

	for _, email := range validEmails {
		if err := utils.ValidateEmail(email); err != nil {
			t.Errorf("Expected email %s to be valid, got error: %v", email, err)
		}
	}

	for _, email := range invalidEmails {
		if err := utils.ValidateEmail(email); err == nil {
			t.Errorf("Expected email %s to be invalid, but it passed validation", email)
		}
	}
}

func TestEncryption(t *testing.T) {
	testData := []string{
		"1234567890123456", // NIK
		"test@example.com", // Email
		"081234567890",     // Phone
		"",                 // Empty string
	}

	for _, data := range testData {
		// Test encryption
		encrypted, err := utils.Encrypt(data)
		if err != nil {
			t.Errorf("Failed to encrypt data %s: %v", data, err)
			continue
		}

		// Test decryption
		decrypted, err := utils.Decrypt(encrypted)
		if err != nil {
			t.Errorf("Failed to decrypt data %s: %v", encrypted, err)
			continue
		}

		// Verify data integrity
		if decrypted != data {
			t.Errorf("Data integrity failed: original=%s, decrypted=%s", data, decrypted)
		}
	}
}

func TestMasking(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
		function func(string) string
	}{
		{"1234567890123456", "************3456", utils.MaskNIK},
		{"081234567890", "0812****90", utils.MaskPhone},
		{"test@example.com", "te****@example.com", utils.MaskEmail},
	}

	for _, tc := range testCases {
		result := tc.function(tc.input)
		if result != tc.expected {
			t.Errorf("Masking failed: input=%s, expected=%s, got=%s", 
				tc.input, tc.expected, result)
		}
	}
}