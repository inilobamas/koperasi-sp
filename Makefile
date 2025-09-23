.PHONY: dev build seed clean test help

# Default target
help:
	@echo "Available commands:"
	@echo "  dev     - Run the application in development mode"
	@echo "  build   - Build the application for current platform"
	@echo "  seed    - Run database seeder"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean build artifacts"
	@echo "  help    - Show this help message"

# Development mode
dev:
	wails dev

# Build application
build:
	wails build

# Build for specific platforms
build-windows:
	wails build -platform windows/amd64

build-macos:
	wails build -platform darwin/amd64

build-linux:
	wails build -platform linux/amd64

# Build for all platforms
build-all: build-windows build-macos build-linux

# Run database seeder
seed:
	@echo "Building and running seeder..."
	go run scripts/seed.go

# Force reseed (reset + seed)
reseed: db-reset seed

# Run tests
test:
	go test ./...

# Run tests with coverage
test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	rm -rf build/
	rm -f coverage.out coverage.html

# Initialize dependencies
deps:
	go mod download
	go mod tidy

# Run linter
lint:
	golangci-lint run

# Format code
fmt:
	go fmt ./...

# Install development tools
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Database operations
db-reset:
	@echo "Resetting database..."
	rm -f ~/.koperasi/koperasi.db
	rm -rf ~/.koperasi/documents
	@echo "Database and documents reset complete"

# Generate migration
migrate-create:
	@read -p "Enter migration name: " name; \
	timestamp=$$(date +%Y%m%d%H%M%S); \
	touch migrations/$${timestamp}_$${name}.up.sql; \
	touch migrations/$${timestamp}_$${name}.down.sql; \
	echo "Created migration files: $${timestamp}_$${name}.up.sql and $${timestamp}_$${name}.down.sql"