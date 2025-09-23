package main

import (
	"log"

	"golang.org/x/crypto/bcrypt"
	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Check users without password hashes
	rows, err := db.Query(`
		SELECT id, email, name, role FROM users 
		WHERE password_hash = '' OR password_hash IS NULL
	`)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	type User struct {
		ID    string
		Email string
		Name  string
		Role  string
	}

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.Role)
		if err != nil {
			log.Printf("Failed to scan user: %v", err)
			continue
		}
		users = append(users, user)
	}

	log.Printf("Found %d users without password hashes", len(users))

	// Update password hashes
	passwordMap := map[string]string{
		"superadmin@koperasi.com": "superadmin123",
		"admin@koperasi.com":      "admin123",
		"karyawan@koperasi.com":   "karyawan123",
		"karyawan1@koperasi.com":  "karyawan123",
		"karyawan2@koperasi.com":  "karyawan123",
		"karyawan3@koperasi.com":  "karyawan123",
		"karyawan4@koperasi.com":  "karyawan123",
		"karyawan5@koperasi.com":  "karyawan123",
		"karyawan6@koperasi.com":  "karyawan123",
		"karyawan7@koperasi.com":  "karyawan123",
		"karyawan8@koperasi.com":  "karyawan123",
	}

	for _, user := range users {
		password, exists := passwordMap[user.Email]
		if !exists {
			log.Printf("No default password found for %s, skipping", user.Email)
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Failed to hash password for %s: %v", user.Email, err)
			continue
		}

		_, err = db.Exec(`UPDATE users SET password_hash = ? WHERE id = ?`, string(hashedPassword), user.ID)
		if err != nil {
			log.Printf("Failed to update password for %s: %v", user.Email, err)
			continue
		}

		log.Printf("Updated password for %s (%s)", user.Email, user.Role)
	}

	log.Println("Password update completed!")
}