package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	Database DatabaseConfig `json:"database"`
	SMTP     SMTPConfig     `json:"smtp"`
	WhatsApp WhatsAppConfig `json:"whatsapp"`
	Storage  StorageConfig  `json:"storage"`
	Security SecurityConfig `json:"security"`
	App      AppConfig      `json:"app"`
}

type DatabaseConfig struct {
	Path string `json:"path"`
}

type SMTPConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	From     string `json:"from"`
}

type WhatsAppConfig struct {
	AccessToken  string `json:"access_token"`
	PhoneNumberID string `json:"phone_number_id"`
	VerifyToken  string `json:"verify_token"`
	WebhookURL   string `json:"webhook_url"`
}

type StorageConfig struct {
	DocumentsPath string `json:"documents_path"`
	UseS3         bool   `json:"use_s3"`
	S3Bucket      string `json:"s3_bucket"`
	S3Region      string `json:"s3_region"`
}

type SecurityConfig struct {
	EncryptionKey string `json:"encryption_key"`
}

type AppConfig struct {
	Name     string `json:"name"`
	Version  string `json:"version"`
	Timezone string `json:"timezone"`
}

func Load() (*Config, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %v", err)
	}

	configPath := filepath.Join(homeDir, ".koperasi", "config.json")
	
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return getDefaultConfig(), nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %v", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %v", err)
	}

	return &config, nil
}

func (c *Config) Save() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %v", err)
	}

	configDir := filepath.Join(homeDir, ".koperasi")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %v", err)
	}

	configPath := filepath.Join(configDir, "config.json")
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	return os.WriteFile(configPath, data, 0644)
}

func getDefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	
	return &Config{
		Database: DatabaseConfig{
			Path: filepath.Join(homeDir, ".koperasi", "koperasi.db"),
		},
		Storage: StorageConfig{
			DocumentsPath: filepath.Join(homeDir, ".koperasi", "documents"),
			UseS3:         false,
		},
		Security: SecurityConfig{
			EncryptionKey: generateEncryptionKey(),
		},
		App: AppConfig{
			Name:     "Koperasi App",
			Version:  "1.0.0",
			Timezone: "Asia/Jakarta",
		},
	}
}

func generateEncryptionKey() string {
	return "age1q0z0x0y0w0v0u0t0s0r0q0p0o0n0m0l0k0j0i0h0g0f0e0d0c0b0a09"
}