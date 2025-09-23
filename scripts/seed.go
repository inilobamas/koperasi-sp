package main

import (
	"log"
	"os"

	"koperasi-app/internal/config"
	"koperasi-app/internal/database"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations first
	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Check if we should reset the database
	if len(os.Args) > 1 && os.Args[1] == "--reset" {
		log.Println("Resetting database...")
		// You could add reset logic here if needed
	}

	// Run seeder
	seeder := database.NewSeeder(db)
	if err := seeder.SeedAll(); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	log.Println("Database seeding completed successfully!")
}