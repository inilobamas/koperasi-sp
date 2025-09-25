package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ValidateNIK validates Indonesian NIK (16 digits only)
func ValidateNIK(nik string) error {
	// Remove any whitespace
	nik = strings.ReplaceAll(nik, " ", "")
	
	// Check length
	if len(nik) != 16 {
		return fmt.Errorf("NIK harus 16 digit")
	}
	
	// Check if all characters are digits
	if _, err := strconv.ParseInt(nik, 10, 64); err != nil {
		return fmt.Errorf("NIK hanya boleh berisi angka")
	}
	
	return nil
}

// ExtractDateFromNIK extracts the date of birth from NIK for debugging
func ExtractDateFromNIK(nik string) (day, month, year int, isFemale bool, err error) {
	nik = strings.ReplaceAll(nik, " ", "")
	if len(nik) != 16 {
		return 0, 0, 0, false, fmt.Errorf("NIK must be 16 digits")
	}
	
	day, _ = strconv.Atoi(nik[6:8])
	month, _ = strconv.Atoi(nik[8:10])
	year, _ = strconv.Atoi(nik[10:12])
	
	// Adjust for female (day > 40)
	if day > 40 {
		day -= 40
		isFemale = true
	}
	
	// Convert 2-digit year to 4-digit
	if year <= 30 {
		year = 2000 + year
	} else {
		year = 1900 + year
	}
	
	return day, month, year, isFemale, nil
}

// ValidateIndonesianPhone validates Indonesian phone numbers
func ValidateIndonesianPhone(phone string) error {
	// Remove any whitespace, dashes, or dots
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, ".", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	
	// Check if it starts with +62 and convert to 0
	if strings.HasPrefix(phone, "+62") {
		phone = "0" + phone[3:]
	} else if strings.HasPrefix(phone, "62") {
		phone = "0" + phone[2:]
	}
	
	// Check if all characters are digits
	if _, err := strconv.ParseInt(phone, 10, 64); err != nil {
		return fmt.Errorf("nomor telepon hanya boleh berisi angka")
	}
	
	// Check length (should be 10-13 digits including 0)
	if len(phone) < 10 || len(phone) > 13 {
		return fmt.Errorf("nomor telepon harus 10-13 digit")
	}
	
	// Must start with 0
	if !strings.HasPrefix(phone, "0") {
		return fmt.Errorf("nomor telepon harus dimulai dengan 0")
	}
	
	// Check valid prefixes for Indonesian numbers
	validPrefixes := []string{
		"0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853", // Telkomsel
		"0814", "0815", "0816", "0855", "0856", "0857", "0858", // Indosat
		"0817", "0818", "0819", "0859", "0877", "0878", // XL
		"0838", "0831", "0832", "0833", "0838", // Axis
		"0895", "0896", "0897", "0898", "0899", // Three
		"0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", // Smartfren
	}
	
	valid := false
	for _, prefix := range validPrefixes {
		if strings.HasPrefix(phone, prefix) {
			valid = true
			break
		}
	}
	
	if !valid {
		return fmt.Errorf("prefix nomor telepon tidak valid untuk operator Indonesia")
	}
	
	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email tidak boleh kosong")
	}
	
	// Basic email regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("format email tidak valid")
	}
	
	return nil
}

// ValidateRequired validates that a field is not empty
func ValidateRequired(value, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s tidak boleh kosong", fieldName)
	}
	return nil
}

// ValidateMinLength validates minimum length
func ValidateMinLength(value string, minLength int, fieldName string) error {
	if len(strings.TrimSpace(value)) < minLength {
		return fmt.Errorf("%s minimal %d karakter", fieldName, minLength)
	}
	return nil
}

// ValidateMaxLength validates maximum length
func ValidateMaxLength(value string, maxLength int, fieldName string) error {
	if len(value) > maxLength {
		return fmt.Errorf("%s maksimal %d karakter", fieldName, maxLength)
	}
	return nil
}

// ValidateNumeric validates that value is numeric
func ValidateNumeric(value string, fieldName string) error {
	if _, err := strconv.ParseFloat(value, 64); err != nil {
		return fmt.Errorf("%s harus berupa angka", fieldName)
	}
	return nil
}

// ValidatePositive validates that numeric value is positive
func ValidatePositive(value float64, fieldName string) error {
	if value <= 0 {
		return fmt.Errorf("%s harus lebih besar dari 0", fieldName)
	}
	return nil
}

// ValidateRange validates that numeric value is within range
func ValidateRange(value, min, max float64, fieldName string) error {
	if value < min || value > max {
		return fmt.Errorf("%s harus antara %.2f dan %.2f", fieldName, min, max)
	}
	return nil
}