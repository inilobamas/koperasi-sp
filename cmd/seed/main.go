package main

import (
	"log"

	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
	"koperasi-app/internal/services"
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

	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	userService := services.NewUserService(db)

	// Create superadmin user
	superAdminReq := services.UserCreateRequest{
		Name:     "Super Admin",
		Email:    "superadmin@koperasi.com",
		Password: "superadmin123",
		Role:     "superadmin",
	}

	superAdmin, err := userService.CreateUser(superAdminReq)
	if err != nil {
		log.Printf("Superadmin user creation failed: %v", err)
	} else {
		log.Printf("Superadmin user created successfully!")
		log.Printf("Email: %s", superAdmin.Email)
		log.Printf("Password: superadmin123")
		log.Printf("Role: %s", superAdmin.Role)
	}

	// Create admin user
	adminReq := services.UserCreateRequest{
		Name:     "Admin",
		Email:    "admin@koperasi.com",
		Password: "admin123",
		Role:     "admin",
	}

	admin, err := userService.CreateUser(adminReq)
	if err != nil {
		log.Printf("Admin user creation failed: %v", err)
	} else {
		log.Printf("Admin user created successfully!")
		log.Printf("Email: %s", admin.Email)
		log.Printf("Password: admin123")
		log.Printf("Role: %s", admin.Role)
	}

	// Create karyawan user
	karyawanReq := services.UserCreateRequest{
		Name:     "Karyawan",
		Email:    "karyawan@koperasi.com",
		Password: "karyawan123",
		Role:     "karyawan",
	}

	karyawan, err := userService.CreateUser(karyawanReq)
	if err != nil {
		log.Printf("Karyawan user creation failed: %v", err)
	} else {
		log.Printf("Karyawan user created successfully!")
		log.Printf("Email: %s", karyawan.Email)
		log.Printf("Password: karyawan123")
		log.Printf("Role: %s", karyawan.Role)
	}

	log.Println("\n=== USER CREDENTIALS ===")
	log.Println("Superadmin - Email: superadmin@koperasi.com, Password: superadmin123")
	log.Println("Admin - Email: admin@koperasi.com, Password: admin123")
	log.Println("Karyawan - Email: karyawan@koperasi.com, Password: karyawan123")
}