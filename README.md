# Koperasi App

Desktop application untuk manajemen koperasi berbasis Wails (Go + React + Tailwind + shadcn/ui).

## Fitur Utama

- ✅ **CRUD Nasabah** dengan validasi NIK/telepon dan enkripsi PII
- ✅ **Sistem Referral** dengan kuota dan masa berlaku
- ✅ **Upload & Verifikasi KTP** dengan penyimpanan lokal
- ✅ **Manajemen Pinjaman & Angsuran**
- 🚧 **Reminder Penagihan** (Email/WhatsApp)
- 🚧 **Dashboard KPI** dan laporan
- 🚧 **RBAC** (Superadmin, Admin, Karyawan)
- ✅ **Audit Logging**

## Persyaratan Sistem

- Go 1.22+
- Node.js 18+
- Wails CLI
- SQLite

## Setup

### 1. Install Dependencies

```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Install Go dependencies
go mod download

# Install frontend dependencies
cd frontend && npm install
```

### 2. Database Setup

```bash
# Jalankan migrasi dan seeder
make seed

# Atau manual:
go run scripts/seed.go
```

### 3. Development

```bash
# Jalankan dalam mode development
make dev

# Atau:
wails dev
```

### 4. Build

```bash
# Build untuk platform saat ini
make build

# Build untuk Windows
make build-windows

# Build untuk macOS
make build-macos
```

## Data Dummy

Seeder menghasilkan:
- 10 pengguna (1 superadmin, 1 admin, 8 karyawan)
- 200 nasabah dengan data random
- Kode referral untuk setiap pengguna
- 300+ pinjaman dengan angsuran
- Template notifikasi lengkap

## Commands

```bash
make dev          # Run development server
make build        # Build application
make seed         # Run database seeder (skips if data exists)
make reseed       # Reset database and reseed (destructive)
make test         # Run tests
make clean        # Clean build artifacts
make db-reset     # Reset database and documents (destructive)
```
