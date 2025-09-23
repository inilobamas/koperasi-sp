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

	createReq := services.UserCreateRequest{
		Name:     "Super Admin",
		Email:    "admin@koperasi.com",
		Password: "admin123",
		Role:     "superadmin",
	}

	user, err := userService.CreateUser(createReq)
	if err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}

	log.Printf("Default admin user created successfully!")
	log.Printf("Email: %s", user.Email)
	log.Printf("Password: admin123")
	log.Printf("Role: %s", user.Role)
}