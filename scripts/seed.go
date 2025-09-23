package main

import (
	"fmt"
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

	// Check if we should reset the database
	if len(os.Args) > 1 && os.Args[1] == "--reset" {
		log.Println("Resetting database...")
		
		// Drop all tables and recreate schema
		tables := []string{
			"notifications", "notification_templates", "loan_installments", 
			"loans", "customer_documents", "customers", "referral_codes", 
			"user_sessions", "users", "audit_logs", "schema_migrations",
		}
		
		for _, table := range tables {
			if _, err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table)); err != nil {
				log.Printf("Warning: Failed to drop table %s: %v", table, err)
			}
		}
		
		log.Println("Database tables dropped. Running migrations...")
	}

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Run seeder
	seeder := database.NewSeeder(db)
	if err := seeder.SeedAll(); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	log.Println("Database seeding completed successfully!")
}